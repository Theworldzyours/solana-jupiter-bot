import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { AppConfig } from '../interfaces/config';

// Load environment variables
dotenv.config();

/**
 * Configuration loader class
 */
export class ConfigLoader {
  private configPath: string;
  
  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config.json');
  }
  
  /**
   * Load configuration from file and environment variables
   */
  public async load(): Promise<AppConfig> {
    // Default configuration
    const defaultConfig: AppConfig = {
      trading: {
        strategy: 'arbitrage',
        inputToken: {
          address: '',
          symbol: '',
          name: '',
          decimals: 0
        },
        outputToken: {
          address: '',
          symbol: '',
          name: '',
          decimals: 0
        },
        tradeSize: 1,
        minPercProfit: 0.1,
        slippage: 10,
        adaptiveSlippage: 0,
        minInterval: 1000,
        simulation: true
      },
      ui: {
        theme: 'default',
        showProfit: true,
        showLatency: true,
        showHistory: true
      },
      rpc: {
        defaultRPC: process.env.DEFAULT_RPC || 'https://api.mainnet-beta.solana.com',
        altRPCList: process.env.ALT_RPC_LIST ? process.env.ALT_RPC_LIST.split(',') : []
      },
      ammsToExclude: {
        'Aldrin': false,
        'Crema': false,
        'Cropper': true,
        'Cykura': true,
        'DeltaFi': false,
        'GooseFX': true,
        'Invariant': false,
        'Lifinity': false,
        'Lifinity V2': false,
        'Marinade': false,
        'Mercurial': false,
        'Meteora': false,
        'Raydium': false,
        'Raydium CLMM': false,
        'Saber': false,
        'Serum': true,
        'Orca': false,
        'Step': false,
        'Penguin': false,
        'Saros': false,
        'Stepn': true,
        'Orca (Whirlpools)': false,
        'Sencha': false,
        'Saber (Decimals)': false,
        'Dradex': true,
        'Balansol': true,
        'Openbook': false,
        'Marco Polo': false,
        'Oasis': false,
        'BonkSwap': false,
        'Phoenix': false,
        'Symmetry': true,
        'Unknown': true
      },
      onlyDirectRoutes: false
    };
    
    try {
      // Check if config file exists
      if (fs.existsSync(this.configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        
        // Merge with default configuration
        return this.mergeConfigs(defaultConfig, fileConfig);
      }
    } catch (error) {
      console.error('Error loading configuration file:', error);
    }
    
    // Return default configuration if file doesn't exist or has issues
    return defaultConfig;
  }
  
  /**
   * Save configuration to file
   * @param config Configuration to save
   */
  public async save(config: AppConfig): Promise<void> {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error saving configuration file:', error);
      throw error;
    }
  }
  
  /**
   * Deep merge two configurations
   * @param target Target configuration
   * @param source Source configuration to merge in
   */
  private mergeConfigs(target: any, source: any): any {
    const output = { ...target };
    
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeConfigs(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }
}

/**
 * Check if value is an object
 * @param item Value to check
 */
function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}