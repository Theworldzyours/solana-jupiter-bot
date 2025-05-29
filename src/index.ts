#!/usr/bin/env node
import path from "path";
import { Application } from "./core/app";
import { ConfigLoader } from "./config/loader";
import { PluginLoader } from "./plugins/loader";
import { EventBus, EventType } from "./core/events";

/**
 * Main entry point for the application
 */
async function main(): Promise<void> {
	try {
		console.log("Starting Solana Jupiter Bot...");

		// Initialize event bus
		const eventBus = EventBus.getInstance();

		// Load configuration
		const configLoader = new ConfigLoader();
		const config = await configLoader.load();

		// Initialize application
		const app = new Application();
		await app.initialize(config);

		// Setup plugins directory
		const pluginsDir = path.join(__dirname, "plugins");
		const pluginLoader = new PluginLoader(pluginsDir, config);

		// Load plugins
		const plugins = await pluginLoader.loadPlugins();
		console.log(`Loaded ${plugins.length} plugins`);

		// Register plugins with the application
		for (const plugin of plugins) {
			await app.registerPlugin(plugin);
		}

		// Start wizard or bot based on command line arguments
		const args = process.argv.slice(2);
		if (args.includes("--wizard") || args.includes("-w")) {
			// TODO: Start wizard UI
			console.log("Starting wizard interface");
		} else if (args.includes("--trade") || args.includes("-t")) {
			// Start trading bot directly
			console.log("Starting trading bot");
			await app.start();
		} else {
			// Default behavior (wizard + bot)
			console.log("Starting wizard and bot");
			// TODO: Start wizard, then start bot when wizard completes
			await app.start();
		}

		// Handle system events
		eventBus.on(EventType.SYSTEM_ERROR, (error) => {
			console.error("System error:", error);
		});
	} catch (error) {
		console.error("Application failed to start:", error);
		process.exit(1);
	}
}

// Run the application
main().catch((error) => {
	console.error("Unhandled error:", error);
	process.exit(1);
});

// Handle process termination
process.on("uncaughtException", (error) => {
	console.error("Uncaught exception:", error);
	process.exit(1);
});

process.on("unhandledRejection", (reason, _promise) => {
	console.error("Unhandled rejection:", reason);
	process.exit(1);
});
