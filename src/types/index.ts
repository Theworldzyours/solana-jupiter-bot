import { PublicKey } from '@solana/web3.js';
import { ReactNode } from 'react';
import JSBI from 'jsbi';

// Basic token type
export interface Token {
  symbol: string;
  address: string;
  decimals: number;
  logoURI?: string;
  name?: string;
}

// Trading strategy types
export type TradingStrategyType = 'pingpong' | 'arbitrage';

// Trade size strategy types
export type TradingSizeStrategy = 'fixed' | 'percentage' | 'cumulative';

// Trading configuration
export interface TradingConfig {
  network: string;
  rpc: string[];
  tradingStrategy: TradingStrategyType;
  tokens: {
    tokenA: Token;
    tokenB: Token;
  };
  tradeSize: {
    strategy: TradingSizeStrategy;
    value: number;
  };
  minPercProfit: number;
  slippage: number;
  priority: number;
  adaptiveSlippage: number;
  minInterval: number;
  storeFailedTxInHistory: boolean;
}

// Plugin interface
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  initialize: () => Promise<void>;
  execute: (context: PluginContext) => Promise<void>;
  cleanup: () => Promise<void>;
}

// Plugin context passed to each plugin
export interface PluginContext {
  config: TradingConfig;
  jupiter: any; // Will be typed more specifically later
  wallet: any; // Will be typed more specifically later
  tokens: {
    tokenA: Token;
    tokenB: Token;
  };
  cache: BotCache;
}

// Trading strategy interface
export interface TradingStrategy {
  name: TradingStrategyType;
  description: string;
  execute: (context: StrategyContext) => Promise<void>;
}

// Strategy context passed to each strategy implementation
export interface StrategyContext {
  jupiter: any; // Will be typed more specifically later
  tokenA: Token;
  tokenB: Token;
  config: TradingConfig;
  cache: BotCache;
  wallet: any; // Will be typed more specifically later
}

// Route information from Jupiter
export interface RouteInfo {
  amount: JSBI;
  outAmount: JSBI;
  otherAmountThreshold: JSBI;
  swapMode: string;
  priceImpactPct: number;
  marketInfos: any[]; // Will be typed more specifically later
  slippageBps: number;
}

// Trade entry for history tracking
export interface TradeEntry {
  date: string;
  buy: boolean;
  inputToken: string;
  outputToken: string;
  inAmount: number;
  expectedOutAmount: number;
  actualOutAmount?: number;
  expectedProfit: number;
  actualProfit?: number;
  slippage: number;
  txid?: string;
  txStatus?: string;
  error?: string;
}

// Bot cache for storing runtime data
export interface BotCache {
  startTime: Date;
  queue: Record<number, number>;
  queueThrottle: number;
  sideBuy: boolean;
  iteration: number;
  walletpubkey: string;
  walletpubkeyfull: string;
  iterationPerMinute: {
    start: number;
    value: number;
    counter: number;
  };
  initialBalance: {
    tokenA: number;
    tokenB: number;
  };
  currentBalance: {
    tokenA: number;
    tokenB: number;
  };
  currentProfit: {
    tokenA: number;
    tokenB: number;
  };
  lastBalance: {
    tokenA: number;
    tokenB: number;
  };
  profit: {
    tokenA: number;
    tokenB: number;
  };
  maxProfitSpotted: {
    buy: number;
    sell: number;
  };
  tradeCounter: {
    buy: { success: number; fail: number };
    sell: { success: number; fail: number };
    failedbalancecheck: number;
    errorcount: number;
  };
  ui: {
    defaultColor: string;
    showPerformanceOfRouteCompChart: boolean;
    showProfitChart: boolean;
    showTradeHistory: boolean;
    hideRpc: boolean;
    showHelp: boolean;
    allowClear: boolean;
  };
  chart: {
    spottedMax: {
      buy: number[];
      sell: number[];
    };
    performanceOfRouteComp: number[];
  };
  hotkeys: {
    e: boolean;
    r: boolean;
  };
  tradingEnabled: boolean;
  wrapUnwrapSOL: boolean;
  swappingRightNow: boolean;
  fetchingResultsFromSolscan: boolean;
  fetchingResultsFromSolscanStart: number;
  tradeHistory: TradeEntry[];
  performanceOfTxStart: number;
  availableRoutes: {
    buy: number;
    sell: number;
  };
  isSetupDone: boolean;
  config: TradingConfig;
  priority?: number;
}

// Wizard context props
export interface WizardContextProps {
  children: ReactNode;
}

// Config actions for the wizard
export interface ConfigAction {
  type: string;
  payload: any;
}