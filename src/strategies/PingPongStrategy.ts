import { PublicKey } from '@solana/web3.js';
import JSBI from 'jsbi';
import { StrategyContext } from '../types';
import { BaseStrategy } from './BaseStrategy';
import { calculateProfit, toDecimal, checkRoutesResponse } from '../utils';

/**
 * PingPong strategy for trading between two tokens
 */
export class PingPongStrategy extends BaseStrategy {
  constructor() {
    super('pingpong', 'Ping pong between two tokens for profit');
  }

  /**
   * Execute the ping pong strategy
   */
  async execute(context: StrategyContext): Promise<void> {
    const { jupiter, tokenA, tokenB, cache } = context;

    try {
      cache.iteration++;
      const date = new Date();
      const i = cache.iteration;
      cache.queue[i] = -1;

      // Calculate amount that will be used for trade
      const amountToTrade =
        cache.config.tradeSize.strategy === 'cumulative'
          ? cache.currentBalance[cache.sideBuy ? 'tokenA' : 'tokenB']
          : cache.initialBalance[cache.sideBuy ? 'tokenA' : 'tokenB'];

      const baseAmount = cache.lastBalance[cache.sideBuy ? 'tokenB' : 'tokenA'];
      const slippage = typeof cache.config.slippage === 'number' ? cache.config.slippage : 1;

      // Set input / output token
      const inputToken = cache.sideBuy ? tokenA : tokenB;
      const outputToken = cache.sideBuy ? tokenB : tokenA;
      
      // Convert to JSBI for Jupiter
      const amountInJSBI = JSBI.BigInt(amountToTrade.toString());

      // Compute routes
      const performanceOfRouteCompStart = performance.now();
      const routes = await jupiter.computeRoutes({
        inputMint: new PublicKey(inputToken.address),
        outputMint: new PublicKey(outputToken.address),
        amount: amountInJSBI,
        slippageBps: slippage,
        feeBps: 0,
        forceFetch: true,
        onlyDirectRoutes: false,
        filterTopNResult: 2,
        enforceSingleTx: false,
        swapMode: 'ExactIn',
      });

      // Check if routes are valid
      checkRoutesResponse(routes);
      
      // Count available routes
      cache.availableRoutes[cache.sideBuy ? 'buy' : 'sell'] = routes.routesInfos.length;

      // Update status as OK
      cache.queue[i] = 0;

      const performanceOfRouteComp = performance.now() - performanceOfRouteCompStart;

      // Choose first route
      const route = routes.routesInfos[0];

      // Calculate profitability
      const simulatedProfit = calculateProfit(baseAmount, Number(route.outAmount.toString()));

      // Log the iteration details
      console.log(
        `[${date.toLocaleString()}] Iteration: ${i}, ${
          cache.sideBuy ? 'Buying' : 'Selling'
        } - Simulated profit: ${simulatedProfit.toFixed(4)}%, Routes: ${
          routes.routesInfos.length
        }`
      );

      // Check if we should execute the trade
      if (simulatedProfit > cache.config.minPercProfit && cache.tradingEnabled) {
        // Execute trade logic would go here
        console.log(`Trade would be executed with profit of ${simulatedProfit.toFixed(4)}%`);
        
        // Toggle for next iteration
        cache.sideBuy = !cache.sideBuy;
      }

    } catch (error) {
      console.error('Error executing ping pong strategy:', error);
    }
  }
}