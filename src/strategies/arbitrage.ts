import { Connection, PublicKey } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { Token } from '../interfaces/config';
import { SimulationResult, TradeResult, TradingStrategy } from '../interfaces/strategy';
import { Jupiter, RouteInfo, TOKEN_LIST_URL } from '@jup-ag/core';
import JSBI from 'jsbi';

/**
 * Implementation of the arbitrage trading strategy
 */
export default class ArbitrageStrategy implements TradingStrategy {
  public name = 'arbitrage';
  public description = 'Find and execute arbitrage opportunities between tokens';
  
  private connection: Connection;
  private eventEmitter: EventEmitter;
  private jupiter: Jupiter | null = null;
  private tokenMap: Map<string, any> = new Map();
  private errorCount = 0;
  
  /**
   * Initialize the arbitrage strategy
   * @param connection Solana connection
   * @param eventBus Event bus for communication
   */
  public async initialize(connection: Connection, eventBus: EventEmitter): Promise<void> {
    this.connection = connection;
    this.eventEmitter = eventBus;
    
    // Initialize Jupiter SDK
    try {
      // Load token list
      const tokens = await (await fetch(TOKEN_LIST_URL[1])).json();
      for (const token of tokens) {
        this.tokenMap.set(token.address, token);
      }
      
      // Initialize Jupiter
      this.jupiter = await Jupiter.load({
        connection,
        cluster: 'mainnet-beta',
        restrictIntermediateTokens: false,
        wrapUnwrapSOL: true,
      });
      
      console.log('Arbitrage strategy initialized');
    } catch (error) {
      console.error('Failed to initialize Jupiter:', error);
      throw error;
    }
  }
  
  /**
   * Execute an arbitrage trade
   * @param inputToken Source token
   * @param outputToken Destination token
   * @param amount Amount to trade
   * @param slippage Maximum slippage allowed
   * @returns The trade result information
   */
  public async execute(
    inputToken: Token,
    outputToken: Token,
    amount: number,
    slippage: number
  ): Promise<TradeResult> {
    if (!this.jupiter) {
      return {
        success: false,
        inputAmount: amount,
        outputAmount: 0,
        profit: 0,
        profitPercentage: 0,
        error: 'Jupiter not initialized',
        latency: 0
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Convert amount to JSBI
      const amountInJSBI = JSBI.BigInt(amount * (10 ** inputToken.decimals));
      
      // Compute routes
      const routes = await this.jupiter.computeRoutes({
        inputMint: new PublicKey(inputToken.address),
        outputMint: new PublicKey(outputToken.address),
        amount: amountInJSBI,
        slippageBps: slippage,
        forceFetch: true,
      });
      
      if (routes.routesInfos.length === 0) {
        return {
          success: false,
          inputAmount: amount,
          outputAmount: 0,
          profit: 0,
          profitPercentage: 0,
          error: 'No routes found',
          latency: Date.now() - startTime
        };
      }
      
      // Get best route
      const bestRoute = routes.routesInfos[0];
      
      // Execute exchange
      const { execute } = await this.jupiter.exchange({
        routeInfo: bestRoute
      });
      
      const result = await execute();
      
      // Calculate output amount and profit
      const outputAmount = Number(bestRoute.outAmount) / (10 ** outputToken.decimals);
      const profit = outputAmount - amount;
      const profitPercentage = (profit / amount) * 100;
      
      return {
        success: true,
        inputAmount: amount,
        outputAmount,
        profit,
        profitPercentage,
        txId: result.txid,
        fees: bestRoute.totalFees,
        latency: Date.now() - startTime
      };
    } catch (error) {
      this.errorCount++;
      console.error('Trade execution error:', error);
      
      // Check if error count exceeds limit
      if (this.errorCount > 100) {
        console.log('Error count is too high for swaps:', this.errorCount);
        console.log('Ending to stop endless transactions failing');
        process.exit(1);
      }
      
      return {
        success: false,
        inputAmount: amount,
        outputAmount: 0,
        profit: 0,
        profitPercentage: 0,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime
      };
    }
  }
  
  /**
   * Simulate an arbitrage trade without execution
   * @param inputToken Source token
   * @param outputToken Destination token
   * @param amount Amount to trade
   * @returns The simulated trade result information
   */
  public async simulate(
    inputToken: Token,
    outputToken: Token,
    amount: number
  ): Promise<SimulationResult> {
    if (!this.jupiter) {
      return {
        success: false,
        inputAmount: amount,
        outputAmount: 0,
        expectedProfit: 0,
        expectedProfitPercentage: 0,
        error: 'Jupiter not initialized',
        latency: 0
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Convert amount to JSBI
      const amountInJSBI = JSBI.BigInt(amount * (10 ** inputToken.decimals));
      
      // Compute routes
      const routes = await this.jupiter.computeRoutes({
        inputMint: new PublicKey(inputToken.address),
        outputMint: new PublicKey(outputToken.address),
        amount: amountInJSBI,
        slippageBps: 0, // No slippage for simulation
        forceFetch: true,
      });
      
      if (routes.routesInfos.length === 0) {
        return {
          success: false,
          inputAmount: amount,
          outputAmount: 0,
          expectedProfit: 0,
          expectedProfitPercentage: 0,
          error: 'No routes found',
          latency: Date.now() - startTime
        };
      }
      
      // Get best route
      const bestRoute = routes.routesInfos[0];
      
      // Calculate output amount and profit
      const outputAmount = Number(bestRoute.outAmount) / (10 ** outputToken.decimals);
      const expectedProfit = outputAmount - amount;
      const expectedProfitPercentage = (expectedProfit / amount) * 100;
      
      return {
        success: true,
        inputAmount: amount,
        outputAmount,
        expectedProfit,
        expectedProfitPercentage,
        latency: Date.now() - startTime
      };
    } catch (error) {
      console.error('Simulation error:', error);
      
      return {
        success: false,
        inputAmount: amount,
        outputAmount: 0,
        expectedProfit: 0,
        expectedProfitPercentage: 0,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime
      };
    }
  }
}