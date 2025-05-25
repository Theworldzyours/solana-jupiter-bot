import { Plugin, PluginContext } from '../types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PluginLoader handles loading, initializing, and executing plugins
 */
export class PluginLoader {
  private plugins: Map<string, Plugin> = new Map();
  private pluginsDir: string;
  
  constructor(pluginsDir: string = path.join(__dirname, 'plugins')) {
    this.pluginsDir = pluginsDir;
  }

  /**
   * Load all available plugins from the plugins directory
   */
  async loadPlugins(): Promise<void> {
    try {
      // Check if plugins directory exists
      if (!fs.existsSync(this.pluginsDir)) {
        console.log(`Plugin directory not found: ${this.pluginsDir}`);
        return;
      }

      // Read directory for plugin files
      const files = fs.readdirSync(this.pluginsDir)
        .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

      // Load each plugin
      for (const file of files) {
        try {
          const pluginPath = path.join(this.pluginsDir, file);
          const pluginModule = require(pluginPath);
          
          // Check if the module exports a plugin
          if (pluginModule.default && this.isValidPlugin(pluginModule.default)) {
            const plugin = pluginModule.default as Plugin;
            this.plugins.set(plugin.id, plugin);
            console.log(`Plugin loaded: ${plugin.name} (${plugin.id})`);
          }
        } catch (err) {
          console.error(`Failed to load plugin from file ${file}:`, err);
        }
      }
      
      console.log(`Loaded ${this.plugins.size} plugins`);
    } catch (err) {
      console.error('Error loading plugins:', err);
    }
  }

  /**
   * Initialize all enabled plugins
   */
  async initializePlugins(): Promise<void> {
    const initPromises: Promise<void>[] = [];
    
    for (const [id, plugin] of this.plugins.entries()) {
      if (plugin.enabled) {
        console.log(`Initializing plugin: ${plugin.name}`);
        initPromises.push(plugin.initialize());
      }
    }
    
    await Promise.all(initPromises);
  }

  /**
   * Execute all enabled plugins with the given context
   */
  async executePlugins(context: PluginContext): Promise<void> {
    for (const [id, plugin] of this.plugins.entries()) {
      if (plugin.enabled) {
        try {
          await plugin.execute(context);
        } catch (err) {
          console.error(`Error executing plugin ${plugin.name}:`, err);
        }
      }
    }
  }

  /**
   * Clean up all enabled plugins
   */
  async cleanupPlugins(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];
    
    for (const [id, plugin] of this.plugins.entries()) {
      if (plugin.enabled) {
        cleanupPromises.push(plugin.cleanup());
      }
    }
    
    await Promise.all(cleanupPromises);
  }

  /**
   * Get a specific plugin by ID
   */
  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Get all loaded plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all enabled plugins
   */
  getEnabledPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.enabled);
  }

  /**
   * Validate that an object implements the Plugin interface
   */
  private isValidPlugin(obj: any): obj is Plugin {
    return (
      obj &&
      typeof obj.id === 'string' &&
      typeof obj.name === 'string' &&
      typeof obj.description === 'string' &&
      typeof obj.version === 'string' &&
      typeof obj.enabled === 'boolean' &&
      typeof obj.initialize === 'function' &&
      typeof obj.execute === 'function' &&
      typeof obj.cleanup === 'function'
    );
  }
}