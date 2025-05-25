#!/usr/bin/env node

import { checkForEnvFile } from './utils';
import * as dotenv from 'dotenv';

// Check for .env file
checkForEnvFile();
dotenv.config();

// Choose between wizard or direct bot execution
const mode = process.env.BOT_MODE || 'wizard';

// Import dynamically to avoid unnecessary loading
const runApp = async () => {
  if (mode === 'wizard') {
    const wizardModule = await import('./wizard');
    const { render } = await import('ink');
    const App = wizardModule.default;
    render(App());
  } else if (mode === 'bot') {
    const botModule = await import('./bot');
    const BotCore = botModule.default;
    const bot = new BotCore();
    await bot.initialize();
    await bot.start();
  } else {
    console.error(`Invalid BOT_MODE: ${mode}. Must be 'wizard' or 'bot'`);
    process.exit(1);
  }
};

// Run the application
runApp().catch((error) => {
  console.error('Error running application:', error);
  process.exit(1);
});