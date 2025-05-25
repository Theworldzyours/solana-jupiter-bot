import { StrategyContext, TradingStrategy, TradingStrategyType } from '../types';

/**
 * Abstract base class for trading strategies
 */
export abstract class BaseStrategy implements TradingStrategy {
  name: TradingStrategyType;
  description: string;
  
  constructor(name: TradingStrategyType, description: string) {
    this.name = name;
    this.description = description;
  }

  /**
   * Execute the strategy
   * @param context The strategy context
   */
  abstract execute(context: StrategyContext): Promise<void>;

  /**
   * Initialize the strategy with any required setup
   */
  async initialize(): Promise<void> {
    console.log(`Strategy ${this.name} initialized`);
  }

  /**
   * Cleanup any resources used by the strategy
   */
  async cleanup(): Promise<void> {
    console.log(`Strategy ${this.name} cleanup complete`);
  }
}