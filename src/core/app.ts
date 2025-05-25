import { Connection } from '@solana/web3.js';
import { EventBus, EventType } from './events';
import { AppConfig } from '../interfaces/config';
import { Plugin } from '../interfaces/plugin';

/**
 * Core application class
 */
export class Application {
  private config: AppConfig;
  private connection: Connection;
  private eventBus: EventBus;
  private plugins: Map<string, Plugin>;
  private isRunning: boolean;
  
  constructor() {
    this.eventBus = EventBus.getInstance();
    this.plugins = new Map();
    this.isRunning = false;
  }
  
  /**
   * Initialize the application with configuration
   * @param config Application configuration
   */
  public async initialize(config: AppConfig): Promise<void> {
    this.config = config;
    
    // Initialize Solana connection
    this.connection = new Connection(this.config.rpc.defaultRPC, 'confirmed');
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Emit config loaded event
    this.eventBus.emit(EventType.CONFIG_LOADED, this.config);
    
    console.log('Application initialized');
  }
  
  /**
   * Register a plugin with the application
   * @param plugin Plugin instance
   */
  public async registerPlugin(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }
    
    // Initialize the plugin
    await plugin.initialize(this.config, this.eventBus.getEmitter());
    
    // Store the plugin
    this.plugins.set(plugin.name, plugin);
    
    // Emit plugin loaded event
    this.eventBus.emit(EventType.PLUGIN_LOADED, {
      name: plugin.name,
      version: plugin.version
    });
    
    console.log(`Plugin '${plugin.name}' v${plugin.version} registered`);
  }
  
  /**
   * Start the application and all registered plugins
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Application is already running');
      return;
    }
    
    console.log('Starting application...');
    
    // Start all plugins
    for (const [name, plugin] of this.plugins.entries()) {
      try {
        await plugin.start();
        this.eventBus.emit(EventType.PLUGIN_STARTED, { name });
        console.log(`Plugin '${name}' started`);
      } catch (error) {
        console.error(`Failed to start plugin '${name}':`, error);
        this.eventBus.emit(EventType.PLUGIN_ERROR, {
          name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    this.isRunning = true;
    this.eventBus.emit(EventType.SYSTEM_READY);
    console.log('Application started');
  }
  
  /**
   * Stop the application and all registered plugins
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Application is not running');
      return;
    }
    
    console.log('Stopping application...');
    
    // Stop all plugins
    for (const [name, plugin] of this.plugins.entries()) {
      try {
        await plugin.stop();
        this.eventBus.emit(EventType.PLUGIN_STOPPED, { name });
        console.log(`Plugin '${name}' stopped`);
      } catch (error) {
        console.error(`Failed to stop plugin '${name}':`, error);
        this.eventBus.emit(EventType.PLUGIN_ERROR, {
          name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    this.isRunning = false;
    this.eventBus.emit(EventType.SYSTEM_SHUTDOWN);
    console.log('Application stopped');
  }
  
  /**
   * Set up application event handlers
   */
  private setupEventHandlers(): void {
    // Handle system errors
    this.eventBus.on(EventType.SYSTEM_ERROR, (error) => {
      console.error('System error:', error);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT signal. Shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\nReceived SIGTERM signal. Shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });
  }
  
  /**
   * Get the Solana connection
   */
  public getConnection(): Connection {
    return this.connection;
  }
  
  /**
   * Get the event bus
   */
  public getEventBus(): EventBus {
    return this.eventBus;
  }
  
  /**
   * Get the application configuration
   */
  public getConfig(): AppConfig {
    return this.config;
  }
  
  /**
   * Update application configuration
   * @param config New configuration
   */
  public updateConfig(config: AppConfig): void {
    this.config = config;
    this.eventBus.emit(EventType.CONFIG_UPDATED, this.config);
  }
}