import * as fs from 'fs';
import * as path from 'path';
import { TradingConfig } from '../types';

/**
 * ConfigManager handles loading and saving configuration for the bot
 */
export class ConfigManager {
  private configPath: string;
  private config: TradingConfig | null = null;
  
  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config.json');
  }

  /**
   * Load configuration from disk
   */
  loadConfig(): TradingConfig {
    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Configuration file does not exist: ${this.configPath}`);
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData) as TradingConfig;
      
      return this.config;
    } catch (err) {
      console.error('Error loading configuration:', err);
      throw err;
    }
  }

  /**
   * Save configuration to disk
   */
  saveConfig(config: TradingConfig): void {
    try {
      this.config = config;
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (err) {
      console.error('Error saving configuration:', err);
      throw err;
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): TradingConfig {
    if (!this.config) {
      return this.loadConfig();
    }
    return this.config;
  }

  /**
   * Update a specific configuration property
   */
  updateConfig<K extends keyof TradingConfig>(key: K, value: TradingConfig[K]): void {
    if (!this.config) {
      this.loadConfig();
    }
    
    if (this.config) {
      this.config[key] = value;
      this.saveConfig(this.config);
    }
  }

  /**
   * Validate the configuration
   */
  validateConfig(config: TradingConfig): boolean {
    // Basic validation rules
    if (!config.network) {
      console.error('Network is not specified in configuration');
      return false;
    }
    
    if (!config.rpc || config.rpc.length === 0) {
      console.error('No RPC endpoints specified in configuration');
      return false;
    }

    if (!config.tokens.tokenA || !config.tokens.tokenA.address) {
      console.error('Token A is not properly configured');
      return false;
    }

    if (!config.tokens.tokenB || !config.tokens.tokenB.address) {
      console.error('Token B is not properly configured');
      return false;
    }

    return true;
  }
}