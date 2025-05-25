import { PublicKey } from '@solana/web3.js';
import JSBI from 'jsbi';
import { StrategyContext } from '../types';
import { BaseStrategy } from './BaseStrategy';
import { calculateProfit, toDecimal, checkRoutesResponse } from '../utils';

/**
 * Arbitrage strategy for finding profitable trading opportunities
 * Looks for price differences between different markets/routes
 */
export class ArbitrageStrategy extends BaseStrategy {
  constructor() {
    super('arbitrage', 'Find and execute arbitrage opportunities between routes');
  }

  /**
   * Execute the arbitrage strategy
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
          ? cache.currentBalance.tokenA
          : cache.initialBalance.tokenA;

      // Convert to JSBI for Jupiter
      const amountInJSBI = JSBI.BigInt(amountToTrade.toString());

      // Set slippage
      const slippage = typeof cache.config.slippage === 'number' ? cache.config.slippage : 1;

      // Set the input / output token (we're looking for a triangular arbitrage)
      const inputToken = tokenA;
      const outputToken = tokenA; // Same as input for triangular arbitrage
      
      // Compute routes for a triangular arbitrage
      const performanceOfRouteCompStart = performance.now();
      
      const routes = await jupiter.computeRoutes({
        inputMint: new PublicKey(inputToken.address),
        outputMint: new PublicKey(outputToken.address),
        amount: amountInJSBI,
        slippageBps: slippage,
        feeBps: 0,
        forceFetch: true,
        onlyDirectRoutes: false, 
        filterTopNResult: 5, // Get more routes for comparison
        enforceSingleTx: false,
        swapMode: 'ExactIn',
      });

      // Check if routes are valid
      checkRoutesResponse(routes);
      
      // Update status as OK
      cache.queue[i] = 0;

      const performanceOfRouteComp = performance.now() - performanceOfRouteCompStart;

      // Check if we have multiple routes to compare
      if (routes.routesInfos.length < 2) {
        console.log('Not enough routes found for arbitrage comparison');
        return;
      }

      // Find the most profitable route
      let mostProfitableRoute = routes.routesInfos[0];
      let highestProfit = calculateProfit(
        amountToTrade,
        Number(mostProfitableRoute.outAmount.toString())
      );

      for (let j = 1; j < routes.routesInfos.length; j++) {
        const route = routes.routesInfos[j];
        const profit = calculateProfit(
          amountToTrade,
          Number(route.outAmount.toString())
        );

        if (profit > highestProfit) {
          highestProfit = profit;
          mostProfitableRoute = route;
        }
      }

      // Log the most profitable route details
      console.log(
        `[${date.toLocaleString()}] Iteration: ${i}, Arbitrage - Best profit: ${highestProfit.toFixed(4)}%, Routes analyzed: ${routes.routesInfos.length}`
      );

      // Check if profit threshold is met and trading is enabled
      if (highestProfit > cache.config.minPercProfit && cache.tradingEnabled) {
        console.log(`Executing arbitrage with expected profit of ${highestProfit.toFixed(4)}%`);
        
        // Here we would execute the trade with the most profitable route
        // In a full implementation, we'd call the swap function
      }

    } catch (error) {
      console.error('Error executing arbitrage strategy:', error);
    }
  }
}