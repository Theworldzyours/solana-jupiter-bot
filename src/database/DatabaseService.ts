import { Pool, PoolClient } from 'pg';
import { createClient } from 'redis';
import { TradeEntry } from '../types';

/**
 * DatabaseService provides database access functionality for the bot
 */
export class DatabaseService {
  private pgPool: Pool | null = null;
  private redisClient: ReturnType<typeof createClient> | null = null;

  /**
   * Initialize the database connections
   */
  async initialize(pgConfig?: any, redisConfig?: any): Promise<void> {
    // Initialize PostgreSQL if config provided
    if (pgConfig) {
      this.pgPool = new Pool(pgConfig);
      
      // Test the connection
      try {
        const client = await this.pgPool.connect();
        client.release();
        console.log('PostgreSQL database connection established');
      } catch (err) {
        console.error('Failed to connect to PostgreSQL database:', err);
        this.pgPool = null;
      }
    }

    // Initialize Redis if config provided
    if (redisConfig) {
      this.redisClient = createClient(redisConfig);
      
      try {
        await this.redisClient.connect();
        console.log('Redis connection established');
      } catch (err) {
        console.error('Failed to connect to Redis:', err);
        this.redisClient = null;
      }
    }
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = null;
    }
    
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }
  }

  /**
   * Check if PostgreSQL is connected
   */
  isPgConnected(): boolean {
    return this.pgPool !== null;
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.redisClient !== null && this.redisClient.isOpen;
  }

  /**
   * Get a PostgreSQL client for transactions
   */
  async getPgClient(): Promise<PoolClient | null> {
    if (!this.pgPool) {
      return null;
    }
    
    try {
      return await this.pgPool.connect();
    } catch (err) {
      console.error('Error getting PostgreSQL client:', err);
      return null;
    }
  }

  /**
   * Cache data in Redis with expiration
   */
  async cacheData(key: string, data: any, expirationInSeconds: number = 3600): Promise<void> {
    if (!this.redisClient || !this.redisClient.isOpen) {
      console.warn('Redis not connected, skipping cache operation');
      return;
    }
    
    try {
      await this.redisClient.set(key, JSON.stringify(data), { EX: expirationInSeconds });
    } catch (err) {
      console.error('Error caching data in Redis:', err);
    }
  }

  /**
   * Get cached data from Redis
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    if (!this.redisClient || !this.redisClient.isOpen) {
      console.warn('Redis not connected, skipping get operation');
      return null;
    }
    
    try {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) as T : null;
    } catch (err) {
      console.error('Error getting cached data from Redis:', err);
      return null;
    }
  }

  /**
   * Save a trade entry to the database
   */
  async saveTradeEntry(trade: TradeEntry): Promise<void> {
    if (!this.pgPool) {
      console.warn('PostgreSQL not connected, skipping save operation');
      return;
    }
    
    const client = await this.getPgClient();
    if (!client) return;
    
    try {
      await client.query(
        `INSERT INTO trades (
          date, buy, input_token, output_token, in_amount, 
          expected_out_amount, actual_out_amount, expected_profit, 
          actual_profit, slippage, txid, tx_status, error
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          trade.date, 
          trade.buy, 
          trade.inputToken, 
          trade.outputToken, 
          trade.inAmount,
          trade.expectedOutAmount, 
          trade.actualOutAmount || null, 
          trade.expectedProfit,
          trade.actualProfit || null, 
          trade.slippage, 
          trade.txid || null, 
          trade.txStatus || null,
          trade.error || null
        ]
      );
    } catch (err) {
      console.error('Error saving trade entry to database:', err);
    } finally {
      client.release();
    }
  }

  /**
   * Get recent trade history from the database
   */
  async getTradeHistory(limit: number = 100): Promise<TradeEntry[]> {
    if (!this.pgPool) {
      console.warn('PostgreSQL not connected, returning empty history');
      return [];
    }
    
    const client = await this.getPgClient();
    if (!client) return [];
    
    try {
      const result = await client.query(
        `SELECT * FROM trades ORDER BY date DESC LIMIT $1`,
        [limit]
      );
      
      return result.rows.map(row => ({
        date: row.date,
        buy: row.buy,
        inputToken: row.input_token,
        outputToken: row.output_token,
        inAmount: parseFloat(row.in_amount),
        expectedOutAmount: parseFloat(row.expected_out_amount),
        actualOutAmount: row.actual_out_amount ? parseFloat(row.actual_out_amount) : undefined,
        expectedProfit: parseFloat(row.expected_profit),
        actualProfit: row.actual_profit ? parseFloat(row.actual_profit) : undefined,
        slippage: parseFloat(row.slippage),
        txid: row.txid,
        txStatus: row.tx_status,
        error: row.error
      }));
    } catch (err) {
      console.error('Error getting trade history from database:', err);
      return [];
    } finally {
      client.release();
    }
  }
}