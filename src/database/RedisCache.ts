import { createClient, RedisClientType } from 'redis';

/**
 * Redis cache manager for the bot
 * Provides caching functionality for frequently accessed data
 */
export class RedisCache {
  private client: RedisClientType | null = null;
  private isConnected = false;
  
  constructor(redisUrl?: string) {
    this.client = createClient({
      url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
    });
    
    this.client.on('error', (err) => {
      console.error('Redis Error:', err);
      this.isConnected = false;
    });
    
    this.client.on('connect', () => {
      console.log('Redis connected');
      this.isConnected = true;
    });
    
    this.client.on('reconnecting', () => {
      console.log('Redis reconnecting...');
      this.isConnected = false;
    });
  }
  
  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    
    try {
      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }
  
  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
  
  /**
   * Set a key with expiry
   * @param key Cache key
   * @param value Value to cache
   * @param expiryInSeconds Time to live in seconds (default: 1 hour)
   */
  async set(key: string, value: any, expiryInSeconds: number = 3600): Promise<void> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis not connected, skipping set operation');
      return;
    }
    
    try {
      await this.client.set(key, JSON.stringify(value), { EX: expiryInSeconds });
    } catch (error) {
      console.error(`Error setting Redis key ${key}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis not connected, skipping get operation');
      return null;
    }
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) as T : null;
    } catch (error) {
      console.error(`Error getting Redis key ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Delete a key from cache
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis not connected, skipping delete operation');
      return;
    }
    
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Error deleting Redis key ${key}:`, error);
      throw error;
    }
  }
  
  /**
   * Check if a key exists in cache
   * @param key Cache key
   * @returns True if key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis not connected, skipping exists operation');
      return false;
    }
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Error checking if Redis key ${key} exists:`, error);
      return false;
    }
  }
  
  /**
   * Set multiple keys at once
   * @param keyValues Object with key-value pairs
   * @param expiryInSeconds Time to live in seconds (default: 1 hour)
   */
  async mset(keyValues: Record<string, any>, expiryInSeconds: number = 3600): Promise<void> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis not connected, skipping mset operation');
      return;
    }
    
    try {
      const pipeline = this.client.multi();
      
      for (const [key, value] of Object.entries(keyValues)) {
        pipeline.set(key, JSON.stringify(value), { EX: expiryInSeconds });
      }
      
      await pipeline.exec();
    } catch (error) {
      console.error('Error setting multiple Redis keys:', error);
      throw error;
    }
  }
  
  /**
   * Get multiple keys at once
   * @param keys Array of keys to get
   * @returns Object with key-value pairs (only for keys that exist)
   */
  async mget<T>(keys: string[]): Promise<Record<string, T>> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis not connected, skipping mget operation');
      return {};
    }
    
    try {
      const values = await this.client.mGet(keys);
      const result: Record<string, T> = {};
      
      for (let i = 0; i < keys.length; i++) {
        if (values[i]) {
          result[keys[i]] = JSON.parse(values[i]!) as T;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error getting multiple Redis keys:', error);
      return {};
    }
  }
}