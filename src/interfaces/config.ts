/**
 * Configuration interfaces for the application
 */

export interface TradingConfig {
  strategy: string;
  inputToken: Token;
  outputToken: Token;
  tradeSize: number;
  minPercProfit: number;
  slippage: number;
  adaptiveSlippage: number;
  minInterval: number;
  simulation: boolean;
}

export interface UIConfig {
  theme: string;
  showProfit: boolean;
  showLatency: boolean;
  showHistory: boolean;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface RPCConfig {
  defaultRPC: string;
  altRPCList: string[];
}

export interface AppConfig {
  trading: TradingConfig;
  ui: UIConfig;
  rpc: RPCConfig;
  ammsToExclude: Record<string, boolean>;
  onlyDirectRoutes: boolean;
}