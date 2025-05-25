-- Initial database schema for Solana Jupiter Bot

-- Create trades table to store trade history
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  buy BOOLEAN NOT NULL,
  input_token VARCHAR(50) NOT NULL,
  output_token VARCHAR(50) NOT NULL,
  in_amount NUMERIC(30, 15) NOT NULL,
  expected_out_amount NUMERIC(30, 15) NOT NULL,
  actual_out_amount NUMERIC(30, 15),
  expected_profit NUMERIC(15, 6) NOT NULL,
  actual_profit NUMERIC(15, 6),
  slippage NUMERIC(15, 6) NOT NULL,
  txid VARCHAR(88),
  tx_status VARCHAR(30),
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on date for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(date);

-- Create index on txid for quick lookups
CREATE INDEX IF NOT EXISTS idx_trades_txid ON trades(txid);

-- Create tokens table to store token information
CREATE TABLE IF NOT EXISTS tokens (
  address VARCHAR(44) PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100),
  decimals INTEGER NOT NULL,
  logo_uri TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create strategies table to store strategy configurations
CREATE TABLE IF NOT EXISTS strategies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create configurations table to store bot configurations
CREATE TABLE IF NOT EXISTS configurations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plugins table to store plugin information
CREATE TABLE IF NOT EXISTS plugins (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  version VARCHAR(20) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallet_balances table to track wallet balances over time
CREATE TABLE IF NOT EXISTS wallet_balances (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(44) NOT NULL,
  token_address VARCHAR(44) NOT NULL,
  balance NUMERIC(30, 15) NOT NULL,
  usd_value NUMERIC(30, 2),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  FOREIGN KEY (token_address) REFERENCES tokens(address) ON DELETE CASCADE
);

-- Create index on wallet_address and recorded_at for time-series queries
CREATE INDEX IF NOT EXISTS idx_wallet_balances_wallet_time ON wallet_balances(wallet_address, recorded_at);