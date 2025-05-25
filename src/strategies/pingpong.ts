import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { Token } from '../interfaces/config';
import { SimulationResult, TradeResult, TradingStrategy } from '../interfaces/strategy';
import axios from 'axios';
import { TransactionUtils } from '../utils/transaction';

/**
 * Jupiter V6 API interface (simplified for our needs)
 */
interface JupiterQuoteResponse {
  data: {
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    otherAmountThreshold: string;
    swapMode: string;
    slippageBps: number;
    platformFee: { amount: string; feeBps: number };
    priceImpactPct: string;
    routePlan: Array<{
      swapInfo: {
        ammKey: string;
        label: string;
        inputMint: string;
        outputMint: string;
        inAmount: string;
        outAmount: string;
        feeAmount: string;
        feeMint: string;
      };
    }>;
    contextSlot: number;
    timeTaken: number;
  }[];
}

interface JupiterSwapResponse {
  swapTransaction: string;
}

/**
 * Implementation of the PingPong trading strategy using Jupiter v6 API
 */
export default class PingPongStrategy implements TradingStrategy {
  public name = 'pingpong';
  public description = 'Trade back and forth between two tokens when profitable';
  
  private connection: Connection;
  private eventEmitter: EventEmitter;
  private jupiterApiBaseUrl = 'https://quote-api.jup.ag/v6';
  private tokenMap: Map<string, any> = new Map();
  private direction: 'ping' | 'pong' = 'ping';
  private errorCount = 0;
  private wallet: any = null;
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
      const tokenListResponse = await axios.get('https://token.jup.ag/all');
      const tokens = tokenListResponse.data;
      
      for (const token of tokens) {
        this.tokenMap.set(token.address, token);
      }
      
      // Setup wallet from environment (for real trading)
      this.wallet = TransactionUtils.loadWallet();
      if (!this.wallet) {
        console.warn('No wallet loaded. Will operate in simulation-only mode.');
      }
      
      console.log('PingPong strategy initialized with Jupiter v6 API');
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
    if (!this.wallet) {
      return {
        success: false,
        inputAmount: amount,
        outputAmount: 0,
        profit: 0,
        profitPercentage: 0,
        error: 'No wallet available for execution',
        latency: 0
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Convert amount to atomic units (considering token decimals)
      const amountInAtomic = Math.floor(amount * Math.pow(10, inputToken.decimals)).toString();
      
      // 1. Get quote from Jupiter API
      const quoteResponse = await axios.get<JupiterQuoteResponse>(`${this.jupiterApiBaseUrl}/quote`, {
        params: {
          inputMint: inputToken.address,
          outputMint: outputToken.address,
          amount: amountInAtomic,
          slippageBps: slippage,
          onlyDirectRoutes: false,
          asLegacyTransaction: true
        }
      });
      
      if (!quoteResponse.data || quoteResponse.data.data.length === 0) {
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
      const bestRoute = quoteResponse.data.data[0];
      
      // 2. Get swap transaction
      const swapResponse = await axios.post<JupiterSwapResponse>(`${this.jupiterApiBaseUrl}/swap`, {
        quoteResponse: bestRoute,
        userPublicKey: this.wallet.publicKey.toString(),
        wrapAndUnwrapSol: true
      });
      
      // 3. Execute the transaction
      const swapTransactionBuf = Buffer.from(swapResponse.data.swapTransaction, 'base64');
      const transaction = Transaction.from(swapTransactionBuf);
      
      // 4. Send and confirm transaction
      const signature = await this.connection.sendTransaction(transaction, [this.wallet]);
      
      // 5. Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      // Calculate output amount
      const outputAmount = parseInt(bestRoute.outAmount) / Math.pow(10, outputToken.decimals);
      
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
        txId: signature,
        fees: 0, // No direct fees info from API
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
    const startTime = Date.now();
    
    try {
      // Convert amount to atomic units (considering token decimals)
      const amountInAtomic = Math.floor(amount * Math.pow(10, inputToken.decimals)).toString();
      
      // Get quote from Jupiter API for the first leg
      const quoteResponse = await axios.get<JupiterQuoteResponse>(`${this.jupiterApiBaseUrl}/quote`, {
        params: {
          inputMint: inputToken.address,
          outputMint: outputToken.address,
          amount: amountInAtomic,
          slippageBps: 0, // No slippage for simulation
          onlyDirectRoutes: false
        }
      });
      
      if (!quoteResponse.data || quoteResponse.data.data.length === 0) {
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
      const bestRoute = quoteResponse.data.data[0];
      
      // Calculate output amount
      const outputAmount = parseInt(bestRoute.outAmount) / Math.pow(10, outputToken.decimals);
      
      // For ping-pong, profit is only realized after a round trip
      let expectedProfit = 0;
      let expectedProfitPercentage = 0;
      
      if (this.direction === 'ping') {
        // For 'ping', we simulate the round trip
        const pongAmount = outputAmount;
        const pongAmountAtomic = Math.floor(pongAmount * Math.pow(10, outputToken.decimals)).toString();
        
        // Simulate pong trade (back to original token)
        const pongQuoteResponse = await axios.get<JupiterQuoteResponse>(`${this.jupiterApiBaseUrl}/quote`, {
          params: {
            inputMint: outputToken.address,
            outputMint: inputToken.address,
            amount: pongAmountAtomic,
            slippageBps: 0, // No slippage for simulation
            onlyDirectRoutes: false
          }
        });
        
        if (pongQuoteResponse.data && pongQuoteResponse.data.data.length > 0) {
          // Simulate complete round trip
          const roundTripOutput = pongQuoteResponse.data.data[0];
          const roundTripAmount = parseInt(roundTripOutput.outAmount) / Math.pow(10, inputToken.decimals);
          
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