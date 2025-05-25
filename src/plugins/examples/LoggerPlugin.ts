import { Plugin, PluginContext } from '../../types';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

/**
 * Example Logger Plugin for the Solana Jupiter Bot
 * This plugin logs trade information to files for analysis
 */
const LoggerPlugin: Plugin = {
  id: 'logger',
  name: 'Trade Logger',
  description: 'Logs trade information to files for analysis',
  version: '1.0.0',
  enabled: true,
  
  // Initialize the plugin
  initialize: async () => {
    const logDir = path.join(process.cwd(), 'logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    console.log('Logger plugin initialized');
  },
  
  // Execute the plugin with context
  execute: async (context: PluginContext) => {
    const { cache } = context;
    
    // Only log when trades happen
    if (cache.swappingRightNow && cache.tradeHistory.length > 0) {
      // Get the latest trade
      const latestTrade = cache.tradeHistory[cache.tradeHistory.length - 1];
      
      // Create log entry
      const logEntry = {
        timestamp: new Date().toISOString(),
        trade: latestTrade,
        wallet: cache.walletpubkey,
        balances: {
          tokenA: cache.currentBalance.tokenA,
          tokenB: cache.currentBalance.tokenB,
        },
        profit: {
          tokenA: cache.currentProfit.tokenA,
          tokenB: cache.currentProfit.tokenB,
        },
      };
      
      // Write to log file
      const logPath = path.join(process.cwd(), 'logs', `trades_${new Date().toISOString().split('T')[0]}.log`);
      
      fs.appendFileSync(
        logPath,
        util.format('%j\n', logEntry)
      );
    }
  },
  
  // Clean up resources when shutting down
  cleanup: async () => {
    console.log('Logger plugin cleanup complete');
  },
};

export default LoggerPlugin;