import { Connection } from '@solana/web3.js';
import { Token } from './config';
import { EventEmitter } from 'events';

/**
 * Common interface for all trading strategies
 */
export interface TradingStrategy {
  /**
   * Name of the strategy
   */
  name: string;
  
  /**
   * Description of the strategy
   */
  description: string;
  
  /**
   * Initialize the strategy with required parameters
   * @param connection Solana connection
   * @param eventBus Event bus for communication
   */
  initialize(connection: Connection, eventBus: EventEmitter): Promise<void>;
  
  /**
   * Execute a trading operation
   * @param inputToken Source token
   * @param outputToken Destination token
   * @param amount Amount to trade
   * @param slippage Maximum slippage allowed
   * @returns The trade result information
   */
  execute(inputToken: Token, outputToken: Token, amount: number, slippage: number): Promise<TradeResult>;
  
  /**
   * Simulate a trade without execution
   * @param inputToken Source token
   * @param outputToken Destination token
   * @param amount Amount to trade
   * @returns The simulated trade result information
   */
  simulate(inputToken: Token, outputToken: Token, amount: number): Promise<SimulationResult>;
}

export interface TradeResult {
  success: boolean;
  inputAmount: number;
  outputAmount: number;
  profit: number;
  profitPercentage: number;
  fees?: number;
  txId?: string;
  error?: string;
  latency: number;
}

export interface SimulationResult {
  success: boolean;
  inputAmount: number;
  outputAmount: number;
  expectedProfit: number;
  expectedProfitPercentage: number;
  error?: string;
  latency: number;
}