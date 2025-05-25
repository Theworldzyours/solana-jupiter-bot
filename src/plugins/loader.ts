import fs from 'fs';
import path from 'path';
import { Plugin } from '../interfaces/plugin';
import { EventBus, EventType } from '../core/events';
import { AppConfig } from '../interfaces/config';

/**
 * Plugin loader for loading and managing plugins
 */
export class PluginLoader {
  private pluginsDir: string;
  private plugins: Map<string, Plugin>;
  private eventBus: EventBus;
  private config: AppConfig;
  
  constructor(pluginsDir: string, config: AppConfig) {
    this.pluginsDir = pluginsDir;
    this.plugins = new Map();
    this.eventBus = EventBus.getInstance();
    this.config = config;
  }
  
  /**
   * Load all plugins from the plugins directory
   */
  public async loadPlugins(): Promise<Plugin[]> {
    const loadedPlugins: Plugin[] = [];
    
    try {
      // Check if plugins directory exists
      if (!fs.existsSync(this.pluginsDir)) {
        console.log(`Creating plugins directory: ${this.pluginsDir}`);
        fs.mkdirSync(this.pluginsDir, { recursive: true });
        return loadedPlugins;
      }
      
      // Get all directories in the plugins directory
      const items = fs.readdirSync(this.pluginsDir);
      
      for (const item of items) {
        const itemPath = path.join(this.pluginsDir, item);
        const stats = fs.statSync(itemPath);
        
        // If it's a directory, try to load it as a plugin
        if (stats.isDirectory()) {
          try {
            // Check if main file exists
            const mainFile = path.join(itemPath, 'index.js');
            const mainTsFile = path.join(itemPath, 'index.ts');
            
            if (!fs.existsSync(mainFile) && !fs.existsSync(mainTsFile)) {
              console.warn(`Plugin '${item}' does not have an index.js or index.ts file. Skipping.`);
              continue;
            }
            
            // Load the plugin
            const pluginModule = await import(itemPath);
            
            // Check if the module exports a Plugin
            if (!pluginModule.default || typeof pluginModule.default.initialize !== 'function') {
              console.warn(`Plugin '${item}' does not export a valid Plugin. Skipping.`);
              continue;
            }
            
            const plugin = pluginModule.default as Plugin;
            
            // Initialize the plugin
            await plugin.initialize(this.config, this.eventBus.getEmitter());
            
            // Store the plugin
            this.plugins.set(plugin.name, plugin);
            
            // Emit plugin loaded event
            this.eventBus.emit(EventType.PLUGIN_LOADED, {
              name: plugin.name,
              version: plugin.version
            });
            
            loadedPlugins.push(plugin);
            console.log(`Plugin '${plugin.name}' v${plugin.version} loaded from ${itemPath}`);
          } catch (error) {
            console.error(`Failed to load plugin from ${itemPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading plugins:', error);
    }
    
    return loadedPlugins;
  }
  
  /**
   * Load a specific plugin by name
   * @param pluginName Name of the plugin
   */
  public async loadPlugin(pluginName: string): Promise<Plugin | null> {
    try {
      const pluginPath = path.join(this.pluginsDir, pluginName);
      
      // Check if plugin directory exists
      if (!fs.existsSync(pluginPath)) {
        console.warn(`Plugin '${pluginName}' directory does not exist.`);
        return null;
      }
      
      // Check if main file exists
      const mainFile = path.join(pluginPath, 'index.js');
      const mainTsFile = path.join(pluginPath, 'index.ts');
      
      if (!fs.existsSync(mainFile) && !fs.existsSync(mainTsFile)) {
        console.warn(`Plugin '${pluginName}' does not have an index.js or index.ts file.`);
        return null;
      }
      
      // Load the plugin
      const pluginModule = await import(pluginPath);
      
      // Check if the module exports a Plugin
      if (!pluginModule.default || typeof pluginModule.default.initialize !== 'function') {
        console.warn(`Plugin '${pluginName}' does not export a valid Plugin.`);
        return null;
      }
      
      const plugin = pluginModule.default as Plugin;
      
      // Initialize the plugin
      await plugin.initialize(this.config, this.eventBus.getEmitter());
      
      // Store the plugin
      this.plugins.set(plugin.name, plugin);
      
      // Emit plugin loaded event
      this.eventBus.emit(EventType.PLUGIN_LOADED, {
        name: plugin.name,
        version: plugin.version
      });
      
      console.log(`Plugin '${plugin.name}' v${plugin.version} loaded`);
      
      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin '${pluginName}':`, error);
      return null;
    }
  }
  
  /**
   * Get a plugin by name
   * @param name Plugin name
   */
  public getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }
  
  /**
   * Get all loaded plugins
   */
  public getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Start all loaded plugins
   */
  public async startAllPlugins(): Promise<void> {
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
  }
  
  /**
   * Stop all loaded plugins
   */
  public async stopAllPlugins(): Promise<void> {
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
  }
}