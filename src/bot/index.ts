#!/usr/bin/env node
import { Connection } from '@solana/web3.js';
import { EventBus, EventType } from '../core/events';
import { ConfigLoader } from '../config/loader';
import { TradingStrategy } from '../interfaces/strategy';
import path from 'path';
import fs from 'fs';

/**
 * Entry point for the trading bot
 */
async function main(): Promise<void> {
  try {
    console.log('Starting Solana Jupiter Trading Bot...');
    
    // Initialize event bus
    const eventBus = EventBus.getInstance();
    
    // Load configuration
    const configLoader = new ConfigLoader();
    const config = await configLoader.load();
    
    // Initialize Solana connection
    const connection = new Connection(config.rpc.defaultRPC, 'confirmed');
    
    // Verify connection
    try {
      const blockHeight = await connection.getBlockHeight();
      console.log(`Connected to Solana (blockHeight: ${blockHeight})`);
    } catch (error) {
      console.error('Failed to connect to Solana RPC:', error);
      process.exit(1);
    }
    
    // Load strategies
    const strategiesDir = path.join(__dirname, '..', 'strategies');
    const strategyName = config.trading.strategy;
    
    // Check if strategy exists
    try {
      // Dynamically import the strategy
      const strategyPath = path.join(strategiesDir, strategyName);
      
      if (!fs.existsSync(`${strategyPath}.ts`) && !fs.existsSync(`${strategyPath}.js`)) {
        console.error(`Strategy '${strategyName}' not found`);
        process.exit(1);
      }
      
      const strategyModule = await import(`../strategies/${strategyName}`);
      
      if (!strategyModule.default) {
        console.error(`Strategy '${strategyName}' does not export a default strategy`);
        process.exit(1);
      }
      
      const strategy = new strategyModule.default() as TradingStrategy;
      
      // Initialize strategy
      await strategy.initialize(connection, eventBus.getEmitter());
      console.log(`Strategy '${strategy.name}' initialized: ${strategy.description}`);
      
      // Setup event handlers
      setupEventHandlers(eventBus, strategy, config);
      
      // Start trading based on configuration
      if (config.trading.simulation) {
        console.log('Starting in simulation mode...');
        await runSimulation(strategy, config);
      } else {
        console.log('Starting in trading mode...');
        await runTrading(strategy, config);
      }
    } catch (error) {
      console.error('Error loading strategy:', error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Bot failed to start:', error);
    process.exit(1);
  }
}

/**
 * Setup event handlers for the bot
 */
function setupEventHandlers(
  eventBus: EventBus, 
  strategy: TradingStrategy, 
  config: any // Use AppConfig type in actual implementation
): void {
  // Handle trade complete events
  eventBus.on(EventType.TRADE_COMPLETE, (result) => {
    console.log(`Trade completed: ${result.success ? 'Success' : 'Failed'}`);
    if (result.success) {
      console.log(`Profit: ${result.profit} (${result.profitPercentage.toFixed(2)}%)`);
    } else if (result.error) {
      console.log(`Error: ${result.error}`);
    }
  });
  
  // Handle simulation complete events
  eventBus.on(EventType.SIMULATION_COMPLETE, (result) => {
    console.log(`Simulation completed: ${result.success ? 'Success' : 'Failed'}`);
    if (result.success) {
      console.log(`Expected profit: ${result.expectedProfit} (${result.expectedProfitPercentage.toFixed(2)}%)`);
    } else if (result.error) {
      console.log(`Error: ${result.error}`);
    }
  });
  
  // Handle UI key press events
  eventBus.on(EventType.UI_KEYPRESS, async (key) => {
    // Handle hotkeys
    switch (key) {
      case 'h':
        console.log('Show/hide help');
        break;
      case 'i':
        console.log('Toggle incognito RPC');
        break;
      case 'e':
        console.log('Force trade execution');
        // Execute trade with current settings
        eventBus.emit(EventType.TRADE_START, {
          inputToken: config.trading.inputToken,
          outputToken: config.trading.outputToken,
          amount: config.trading.tradeSize,
          slippage: config.trading.slippage
        });
        break;
      case 'r':
        console.log('Force execution and stop');
        // Execute trade with current settings
        eventBus.emit(EventType.TRADE_START, {
          inputToken: config.trading.inputToken,
          outputToken: config.trading.outputToken,
          amount: config.trading.tradeSize,
          slippage: config.trading.slippage
        });
        // Exit after execution
        process.exit(0);
        break;
      case 'l':
        console.log('Show/hide latency chart');
        break;
      case 'p':
        console.log('Show/hide profit chart');
        break;
      case 't':
        console.log('Show/hide trade history');
        break;
      case 's':
        console.log('Toggle simulation mode');
        break;
      default:
        break;
    }
  });
}

/**
 * Run the bot in simulation mode
 */
async function runSimulation(
  strategy: TradingStrategy, 
  config: any // Use AppConfig type in actual implementation
): Promise<void> {
  console.log('Running simulation...');
  
  // Setup interval for simulation
  const interval = setInterval(async () => {
    try {
      const result = await strategy.simulate(
        config.trading.inputToken,
        config.trading.outputToken,
        config.trading.tradeSize
      );
      
      // Emit simulation complete event
      EventBus.getInstance().emit(EventType.SIMULATION_COMPLETE, result);
    } catch (error) {
      console.error('Simulation error:', error);
    }
  }, config.trading.minInterval);
  
  // Handle process termination
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\nSimulation stopped by user');
    process.exit(0);
  });
}

/**
 * Run the bot in trading mode
 */
async function runTrading(
  strategy: TradingStrategy, 
  config: any // Use AppConfig type in actual implementation
): Promise<void> {
  console.log('Running trading...');
  
  // Setup interval for trading
  const interval = setInterval(async () => {
    try {
      // First simulate to check profitability
      const simResult = await strategy.simulate(
        config.trading.inputToken,
        config.trading.outputToken,
        config.trading.tradeSize
      );
      
      // If simulation is profitable, execute trade
      if (
        simResult.success && 
        simResult.expectedProfitPercentage >= config.trading.minPercProfit
      ) {
        const tradeResult = await strategy.execute(
          config.trading.inputToken,
          config.trading.outputToken,
          config.trading.tradeSize,
          config.trading.slippage
        );
        
        // Emit trade complete event
        EventBus.getInstance().emit(EventType.TRADE_COMPLETE, tradeResult);
      } else {
        console.log('Simulation not profitable, skipping trade');
      }
    } catch (error) {
      console.error('Trading error:', error);
    }
  }, config.trading.minInterval);
  
  // Handle process termination
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\nTrading stopped by user');
    process.exit(0);
  });
}

// Run the bot
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});