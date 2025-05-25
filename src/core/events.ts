import { EventEmitter } from 'events';

/**
 * Event types used throughout the application
 */
export enum EventType {
  // System events
  SYSTEM_READY = 'system:ready',
  SYSTEM_SHUTDOWN = 'system:shutdown',
  SYSTEM_ERROR = 'system:error',
  
  // Trading events
  TRADE_START = 'trade:start',
  TRADE_COMPLETE = 'trade:complete',
  TRADE_ERROR = 'trade:error',
  SIMULATION_COMPLETE = 'simulation:complete',
  
  // Config events
  CONFIG_LOADED = 'config:loaded',
  CONFIG_UPDATED = 'config:updated',
  
  // UI events
  UI_UPDATE = 'ui:update',
  UI_KEYPRESS = 'ui:keypress',
  
  // Plugin events
  PLUGIN_LOADED = 'plugin:loaded',
  PLUGIN_STARTED = 'plugin:started',
  PLUGIN_STOPPED = 'plugin:stopped',
  PLUGIN_ERROR = 'plugin:error'
}

/**
 * Core event bus implementation
 */
export class EventBus {
  private static instance: EventBus;
  private eventEmitter: EventEmitter;
  
  private constructor() {
    this.eventEmitter = new EventEmitter();
    // Increase max listeners as we will have many subscribers
    this.eventEmitter.setMaxListeners(50);
  }
  
  /**
   * Get the singleton instance of EventBus
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  
  /**
   * Get the underlying event emitter
   */
  public getEmitter(): EventEmitter {
    return this.eventEmitter;
  }
  
  /**
   * Emit an event with optional data
   * @param event Event type
   * @param data Data to emit with the event
   */
  public emit(event: EventType, data?: any): void {
    this.eventEmitter.emit(event, data);
  }
  
  /**
   * Register an event listener
   * @param event Event type
   * @param listener Function to call when event is emitted
   */
  public on(event: EventType, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }
  
  /**
   * Register a one-time event listener
   * @param event Event type
   * @param listener Function to call when event is emitted
   */
  public once(event: EventType, listener: (...args: any[]) => void): void {
    this.eventEmitter.once(event, listener);
  }
  
  /**
   * Remove an event listener
   * @param event Event type
   * @param listener Function to remove
   */
  public off(event: EventType, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
  
  /**
   * Remove all listeners for an event
   * @param event Event type
   */
  public removeAllListeners(event?: EventType): void {
    if (event) {
      this.eventEmitter.removeAllListeners(event);
    } else {
      this.eventEmitter.removeAllListeners();
    }
  }
}