import fs from "fs";
import chalk from "chalk";
import cache from "./cache";

/**
 * Log exit message and error based on exit code
 *
 * @param code - Exit code (0 for normal exit, 1 for error exit)
 * @param error - Error object with message and stack properties
 */
export const logExit = (code = 0, error?: Error): void => {
	if (code === 0 && error?.message) {
		console.log(chalk.black.bgMagentaBright.bold(error.message));
	}

	if (code === 1) {
		if (error?.message) {
			console.log(
				chalk.black.bgRedBright.black("ERROR: " + chalk.bold(error.message)),
			);
		}

		if (error?.stack) {
			console.log(chalk.redBright(error.stack));
		}

		if (cache.isSetupDone) {
			console.log(
				chalk.black.bgYellowBright(
					"Closing connections... ",
					chalk.bold("WAIT! "),
				),
			);
			console.log(chalk.yellowBright.bgBlack("Press [Ctrl]+[C] to force exit"));
		}
	}
};

/**
 * Handle application exit tasks
 * - Save cache and trade history to files
 */
export const handleExit = (): void => {
	try {
		console.log(
			chalk.black.bgMagentaBright(
				`\n	Exit time:  ${chalk.bold(new Date().toLocaleString())} `,
			),
		);

		// Create the temp directory if it doesn't exist
		if (!fs.existsSync("./temp")) {
			fs.mkdirSync("./temp", { recursive: true });
		}

		// write cache to file
		try {
			fs.writeFileSync("./temp/cache.json", JSON.stringify(cache, null, 2));
			console.log(
				chalk.black.bgGreenBright(
					`		> Cache saved to ${chalk.bold("./temp/cache.json")} `,
				),
			);
		} catch (error) {
			console.log(
				chalk.black.bgRedBright(
					`		X Error saving cache to ${chalk.bold("./temp/cache.json")} `,
				),
			);
		}

		// write trade history to file
		try {
			fs.writeFileSync(
				"./temp/tradeHistory.json",
				JSON.stringify(cache.tradeHistory, null, 2),
			);
			console.log(
				chalk.black.bgGreenBright(
					`		> Trade history saved to ${chalk.bold("./temp/tradeHistory.json")} `,
				),
			);
		} catch (error) {
			console.log(
				chalk.black.bgRedBright(
					`		X Error saving trade history to ${chalk.bold(
						"./temp/tradeHistory.json",
					)} `,
				),
			);
		}
		console.log(chalk.black.bgMagentaBright.bold("	Exit Done! \n"));
	} catch (error) {
		console.log(error);
	}
};
