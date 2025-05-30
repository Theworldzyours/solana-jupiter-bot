interface TradeCounter {
	buy: { success: number; fail: number };
	sell: { success: number; fail: number };
	failedbalancecheck: number;
	errorcount: number;
}

interface BalanceInfo {
	tokenA: number;
	tokenB: number;
}

interface UiConfig {
	defaultColor: string;
	showPerformanceOfRouteCompChart: boolean;
	showProfitChart: boolean;
	showTradeHistory: boolean;
	hideRpc: boolean;
	showHelp: boolean;
	allowClear: boolean;
}

interface ChartData {
	spottedMax: {
		buy: number[];
		sell: number[];
	};
	performanceOfRouteComp: number[];
}

interface HotKeys {
	e: boolean;
	r: boolean;
}

interface AvailableRoutes {
	buy: number;
	sell: number;
}

interface IterationPerMinute {
	start: number;
	value: number;
	counter: number;
}

interface MaxProfitSpotted {
	buy: number;
	sell: number;
}

interface TradeHistoryEntry {
	timestamp: number;
	type: string;
	amount: number;
	profit?: number;
	success: boolean;
	error?: string;
}

// Global cache interface
interface BotCache {
	startTime: Date;
	queue: Record<string, unknown>;
	queueThrottle: number;
	sideBuy: boolean;
	iteration: number;
	walletpubkey: string;
	walletpubkeyfull: string;
	iterationPerMinute: IterationPerMinute;
	initialBalance: BalanceInfo;
	currentBalance: BalanceInfo;
	currentProfit: BalanceInfo;
	lastBalance: BalanceInfo;
	profit: BalanceInfo;
	maxProfitSpotted: MaxProfitSpotted;
	tradeCounter: TradeCounter;
	ui: UiConfig;
	chart: ChartData;
	hotkeys: HotKeys;
	tradingEnabled: boolean;
	wrapUnwrapSOL: boolean;
	swappingRightNow: boolean;
	fetchingResultsFromSolscan: boolean;
	fetchingResultsFromSolscanStart: number;
	tradeHistory: TradeHistoryEntry[];
	performanceOfTxStart: number;
	availableRoutes: AvailableRoutes;
	isSetupDone: boolean;
}

// Global cache with initial values
const cache: BotCache = {
	startTime: new Date(),
	queue: {},
	queueThrottle: 1,
	sideBuy: true,
	iteration: 0,
	walletpubkey: "",
	walletpubkeyfull: "",
	iterationPerMinute: {
		start: performance.now(),
		value: 0,
		counter: 0,
	},
	initialBalance: {
		tokenA: 0,
		tokenB: 0,
	},
	currentBalance: {
		tokenA: 0,
		tokenB: 0,
	},
	currentProfit: {
		tokenA: 0,
		tokenB: 0,
	},
	lastBalance: {
		tokenA: 0,
		tokenB: 0,
	},
	profit: {
		tokenA: 0,
		tokenB: 0,
	},
	maxProfitSpotted: {
		buy: 0,
		sell: 0,
	},
	tradeCounter: {
		buy: { success: 0, fail: 0 },
		sell: { success: 0, fail: 0 },
		failedbalancecheck: 0,
		errorcount: 0,
	},
	ui: {
		defaultColor: process.env.UI_COLOR ?? "cyan",
		showPerformanceOfRouteCompChart: false,
		showProfitChart: false,
		showTradeHistory: false,
		hideRpc: false,
		showHelp: false,
		allowClear: true,
	},
	chart: {
		spottedMax: {
			buy: new Array(120).fill(0),
			sell: new Array(120).fill(0),
		},
		performanceOfRouteComp: new Array(120).fill(0),
	},
	hotkeys: {
		e: false,
		r: false,
	},
	tradingEnabled:
		process.env.TRADING_ENABLED === undefined
			? true
			: process.env.TRADING_ENABLED === "true",
	wrapUnwrapSOL:
		process.env.WRAP_UNWRAP_SOL === undefined
			? true
			: process.env.WRAP_UNWRAP_SOL === "true",
	swappingRightNow: false,
	fetchingResultsFromSolscan: false,
	fetchingResultsFromSolscanStart: 0,
	tradeHistory: [],
	performanceOfTxStart: 0,
	availableRoutes: {
		buy: 0,
		sell: 0,
	},
	isSetupDone: false,
};

export default cache;
