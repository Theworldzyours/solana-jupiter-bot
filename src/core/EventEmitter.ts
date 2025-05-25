type EventCallback = (...args: any[]) => void;

/**
 * Simple event emitter implementation for the bot's event-driven architecture
 */
export class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map();
  
  /**
   * Register an event listener
   * @param event The event name
   * @param callback The callback function
   */
  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    this.events.get(event)!.push(callback);
  }
  
  /**
   * Register a one-time event listener
   * @param event The event name
   * @param callback The callback function
   */
  once(event: string, callback: EventCallback): void {
    const onceCallback = (...args: any[]) => {
      this.off(event, onceCallback);
      callback(...args);
    };
    
    this.on(event, onceCallback);
  }
  
  /**
   * Remove an event listener
   * @param event The event name
   * @param callback The callback function to remove
   */
  off(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      return;
    }
    
    const callbacks = this.events.get(event)!;
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
      
      if (callbacks.length === 0) {
        this.events.delete(event);
      } else {
        this.events.set(event, callbacks);
      }
    }
  }
  
  /**
   * Emit an event
   * @param event The event name
   * @param args Arguments to pass to the event listeners
   */
  emit(event: string, ...args: any[]): void {
    if (!this.events.has(event)) {
      return;
    }
    
    const callbacks = [...this.events.get(event)!];
    
    for (const callback of callbacks) {
      try {
        callback(...args);
      } catch (err) {
        console.error(`Error in event listener for "${event}":`, err);
      }
    }
  }
  
  /**
   * Remove all listeners for an event
   * @param event The event name (optional, if not provided, removes all listeners for all events)
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
  
  /**
   * Get the number of listeners for an event
   * @param event The event name
   */
  listenerCount(event: string): number {
    if (!this.events.has(event)) {
      return 0;
    }
    
    return this.events.get(event)!.length;
  }
  
  /**
   * Get all registered event names
   */
  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}