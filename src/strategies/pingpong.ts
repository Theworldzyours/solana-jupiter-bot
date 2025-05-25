import { Connection, PublicKey } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { Token } from '../interfaces/config';
import { SimulationResult, TradeResult, TradingStrategy } from '../interfaces/strategy';
import { Jupiter, RouteInfo, TOKEN_LIST_URL } from '@jup-ag/core';
import JSBI from 'jsbi';

/**
 * Implementation of the PingPong trading strategy
 */
export default class PingPongStrategy implements TradingStrategy {
  public name = 'pingpong';
  public description = 'Trade back and forth between two tokens when profitable';
  
  private connection: Connection;
  private eventEmitter: EventEmitter;
  private jupiter: Jupiter | null = null;
  private tokenMap: Map<string, any> = new Map();
  private direction: 'ping' | 'pong' = 'ping';
  private errorCount = 0;
  private lastTrade: {
    inputToken: Token;
    outputToken: Token;
    inputAmount: number;
    outputAmount: number;
    timestamp: number;
  } | null = null;
  
  /**
   * Initialize the PingPong strategy
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
      
      console.log('PingPong strategy initialized');
    } catch (error) {
      console.error('Failed to initialize Jupiter:', error);
      throw error;
    }
  }
  
  /**
   * Execute a PingPong trade
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
      
      // For ping-pong, we need to compare with the last trade in the opposite direction
      let profit = 0;
      let profitPercentage = 0;
      
      if (this.lastTrade) {
        // Calculate profit compared to the original amount
        if (this.direction === 'pong') {
          // We're back to our original token, so compare with the original amount
          profit = outputAmount - this.lastTrade.inputAmount;
          profitPercentage = (profit / this.lastTrade.inputAmount) * 100;
        }
      }
      
      // Update last trade
      this.lastTrade = {
        inputToken,
        outputToken,
        inputAmount: amount,
        outputAmount,
        timestamp: Date.now()
      };
      
      // Flip direction for next trade
      this.direction = this.direction === 'ping' ? 'pong' : 'ping';
      
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
   * Simulate a PingPong trade without execution
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
      
      // Calculate output amount and expected profit
      const outputAmount = Number(bestRoute.outAmount) / (10 ** outputToken.decimals);
      
      // For ping-pong, profit is only realized after a round trip
      let expectedProfit = 0;
      let expectedProfitPercentage = 0;
      
      if (this.direction === 'ping') {
        // For 'ping', we simulate the round trip
        const pongAmountJSBI = bestRoute.outAmount;
        
        // Simulate pong trade (back to original token)
        const pongRoutes = await this.jupiter.computeRoutes({
          inputMint: new PublicKey(outputToken.address),
          outputMint: new PublicKey(inputToken.address),
          amount: pongAmountJSBI,
          slippageBps: 0,
          forceFetch: true,
        });
        
        if (pongRoutes.routesInfos.length > 0) {
          // Simulate complete round trip
          const roundTripAmount = Number(pongRoutes.routesInfos[0].outAmount) / (10 ** inputToken.decimals);
          
          expectedProfit = roundTripAmount - amount;
          expectedProfitPercentage = (expectedProfit / amount) * 100;
        }
      } else {
        // For 'pong', we compare with the original token amount
        if (this.lastTrade) {
          expectedProfit = outputAmount - this.lastTrade.inputAmount;
          expectedProfitPercentage = (expectedProfit / this.lastTrade.inputAmount) * 100;
        }
      }
      
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