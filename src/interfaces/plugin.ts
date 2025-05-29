import { AppConfig } from "./config";
import { EventEmitter } from "events";

/**
 * Base plugin interface
 */
export interface Plugin {
	/**
	 * Name of the plugin
	 */
	name: string;

	/**
	 * Version of the plugin
	 */
	version: string;

	/**
	 * Description of the plugin
	 */
	description: string;

	/**
	 * Initialize the plugin
	 * @param config Application configuration
	 * @param eventBus Event bus for communication
	 */
	initialize(config: AppConfig, eventBus: EventEmitter): Promise<void>;

	/**
	 * Start the plugin
	 */
	start(): Promise<void>;

	/**
	 * Stop the plugin
	 */
	stop(): Promise<void>;

	/**
	 * Get plugin status
	 */
	getStatus(): { active: boolean; details?: Record<string, any> };
}
