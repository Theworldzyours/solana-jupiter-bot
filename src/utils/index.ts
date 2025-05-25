import chalk from 'chalk';
import * as fs from 'fs';
import ora from 'ora-classic';
import JSBI from 'jsbi';
import bs58 from 'bs58';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import { BotCache } from '../types';

dotenv.config();

/**
 * Create a temporary directory if it doesn't exist
 */
export const createTempDir = (): boolean => 
  !fs.existsSync('./temp') && fs.mkdirSync('./temp');

/**
 * Get a circular replacer for JSON.stringify
 */
export const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    } else if (typeof value === 'bigint') {
      value = value.toString();
    }
    return value;
  };
};

/**
 * Store data in a temp file as JSON
 */
export const storeItInTempAsJSON = (filename: string, data: any): void =>
  fs.writeFileSync(`./temp/${filename}.json`, JSON.stringify(data, getCircularReplacer(), 2));

/**
 * Create a config file from provided configuration
 */
export const createConfigFile = (config: any): void => {
  const configSpinner = ora({
    text: 'Creating configuration file...',
    color: 'yellow',
  }).start();

  try {
    if (!fs.existsSync('./config')) {
      fs.mkdirSync('./config');
    }

    fs.writeFileSync('./config/bot.config.json', JSON.stringify(config, null, 2));

    configSpinner.succeed('Configuration file created successfully!');
  } catch (error) {
    configSpinner.fail(`Failed to create configuration file: ${error}`);
    process.exit(1);
  }
};

/**
 * Load a config file from disk
 */
export const loadConfigFile = (configPath: string): any => {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config;
  } catch (error) {
    console.error(`Error loading config file: ${error}`);
    process.exit(1);
  }
};

/**
 * Verify the configuration is valid
 */
export const verifyConfig = (config: any): boolean => {
  const requiredKeys = [
    'network',
    'rpc',
    'tradingStrategy',
    'tokens',
    'tradeSize',
    'minPercProfit',
    'slippage',
  ];

  const missingKeys = requiredKeys.filter((key) => !config[key]);

  if (missingKeys.length > 0) {
    console.error(
      chalk.red(`Missing required configuration keys: ${missingKeys.join(', ')}`)
    );
    return false;
  }

  return true;
};

/**
 * Calculate profit between two amounts
 */
export const calculateProfit = (baseAmount: number | string, newAmount: number | string): number => {
  const base = typeof baseAmount === 'string' ? parseFloat(baseAmount) : baseAmount;
  const newAmt = typeof newAmount === 'string' ? parseFloat(newAmount) : newAmount;
  
  if (base <= 0) return 0;
  
  return ((newAmt - base) / base) * 100;
};

/**
 * Convert a JSBI value to a decimal representation
 */
export const toDecimal = (value: JSBI | number | string, decimals: number = 0): number => {
  if (JSBI.instanceOf(value)) {
    return Number(JSBI.divide(value, JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimals))));
  } else if (typeof value === 'string') {
    return Number(value) / Math.pow(10, decimals);
  } else {
    return value / Math.pow(10, decimals);
  }
};

/**
 * Convert a value to number
 */
export const toNumber = (value: JSBI | number | string): number => {
  if (JSBI.instanceOf(value)) {
    return Number(value.toString());
  } else if (typeof value === 'string') {
    return Number(value);
  }
  return value;
};

/**
 * Update iterations per minute calculation
 */
export const updateIterationsPerMin = (cache: BotCache): void => {
  const now = performance.now();
  cache.iterationPerMinute.counter++;
  
  // Update every second (1000ms)
  if (now - cache.iterationPerMinute.start > 1000) {
    cache.iterationPerMinute.value = Math.floor(
      (cache.iterationPerMinute.counter / (now - cache.iterationPerMinute.start)) * 60000
    );
    cache.iterationPerMinute.start = now;
    cache.iterationPerMinute.counter = 0;
  }
};

/**
 * Check if Jupiter routes response is valid
 */
export const checkRoutesResponse = (routes: any): void => {
  if (routes && routes.routesInfos) {
    if (routes.routesInfos.length === 0) {
      console.log(routes);
      console.error('No routes found or something is wrong with RPC / Jupiter!');
      process.exit(1);
    }
  } else {
    console.log(routes);
    console.error('Something is wrong with RPC / Jupiter!');
    process.exit(1);
  }
};

/**
 * Display a formatted message to console
 */
export function displayMessage(message: string): void {
  const lineLength = 75;
  console.log('\n');
  console.log('\x1b[93m*\x1b[0m'.repeat(lineLength / 2)); // Display top border in light yellow
  console.log('\n');
  
  // Split message by newlines and display each line
  const lines = message.split('\n');
  for (const line of lines) {
    console.log(`\x1b[1m\x1b[37m${line}\x1b[0m`); // Display in bright white and bold
  }
  
  console.log('\n');
  console.log('\x1b[93m*\x1b[0m'.repeat(lineLength / 2)); // Display bottom border in light yellow
  console.log('\n');
}

/**
 * Check if .env file exists
 */
export const checkForEnvFile = (): void => {
  if (!fs.existsSync('./.env')) {
    displayMessage('Please refer to the readme to set up the Bot properly.\n\nYou have not created the .ENV file yet.\n\nRefer to the .env.example file.');
    process.exit(1);
  }
};

/**
 * Check if wallet is properly configured
 */
export const checkWallet = (): void => {
  if (
    !process.env.SOLANA_WALLET_PRIVATE_KEY ||
    (process.env.SOLANA_WALLET_PUBLIC_KEY &&
      process.env.SOLANA_WALLET_PUBLIC_KEY?.length !== 44)
  ) {
    displayMessage(
      'Invalid wallet configuration. Please check your .env file and make sure SOLANA_WALLET_PRIVATE_KEY is set correctly.'
    );
    process.exit(1);
  }
};

/**
 * Check if the wallet is ARB ready
 */
export const checkArbReady = async (): Promise<boolean> => {
  try {
    // This would be implemented to check ARB token balance
    // Mock implementation for now
    return true;
  } catch (err) {
    console.clear();
    displayMessage(
      'You do not seem to be ARB ready!\n\nCheck the .ENV file to see your RPC is set up properly and your wallet is set to the correct private key.'
    );
    process.exit(1);
    return false;
  }
};