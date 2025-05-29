import {
	Connection,
	Keypair,
	PublicKey,
	Transaction,
	TransactionInstruction,
	sendAndConfirmTransaction,
	SendOptions,
} from "@solana/web3.js";
import bs58 from "bs58";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Transaction utility functions
 */
export class TransactionUtils {
	/**
	 * Create a keypair from private key
	 * @param privateKey Private key (base58 string or bytes array)
	 * @returns Solana keypair
	 */
	public static createKeypairFromPrivateKey(
		privateKey: string | Uint8Array,
	): Keypair {
		let secretKey: Uint8Array;

		if (typeof privateKey === "string") {
			// Convert from base58 string
			secretKey = bs58.decode(privateKey);
		} else {
			secretKey = privateKey;
		}

		return Keypair.fromSecretKey(secretKey);
	}

	/**
	 * Load wallet from environment or provided key
	 * @param privateKey Optional private key to use instead of env
	 * @returns Keypair or null if not available
	 */
	public static loadWallet(privateKey?: string): Keypair | null {
		try {
			// Use provided key or get from environment
			const key = privateKey || process.env.SOLANA_WALLET_PRIVATE_KEY;

			if (!key) {
				console.error("No private key provided");
				return null;
			}

			return this.createKeypairFromPrivateKey(key);
		} catch (error) {
			console.error("Error loading wallet:", error);
			return null;
		}
	}

	/**
	 * Send transaction with retry
	 * @param connection Solana connection
	 * @param transaction Transaction to send
	 * @param signers Signers for the transaction
	 * @param options Send options
	 * @param maxRetries Maximum number of retries
	 * @returns Transaction signature
	 */
	public static async sendTransactionWithRetry(
		connection: Connection,
		transaction: Transaction,
		signers: Keypair[],
		options: SendOptions = {},
		maxRetries = 3,
	): Promise<string> {
		let signature = "";
		let retries = 0;

		while (retries < maxRetries) {
			try {
				signature = await sendAndConfirmTransaction(
					connection,
					transaction,
					signers,
					options,
				);

				// Success
				return signature;
			} catch (error) {
				retries++;

				if (retries >= maxRetries) {
					// Rethrow error after max retries
					throw error;
				}

				console.log(`Retrying transaction... (${retries}/${maxRetries})`);

				// Wait before retrying
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		return signature;
	}

	/**
	 * Get transaction status
	 * @param connection Solana connection
	 * @param signature Transaction signature
	 * @returns Transaction status and info
	 */
	public static async getTransactionStatus(
		connection: Connection,
		signature: string,
	): Promise<any> {
		try {
			// Get transaction status
			const status = await connection.getSignatureStatus(signature, {
				searchTransactionHistory: true,
			});

			// Get transaction info
			const transaction = await connection.getParsedTransaction(signature);

			return {
				status,
				transaction,
				signature,
			};
		} catch (error) {
			console.error("Error getting transaction status:", error);
			throw error;
		}
	}
}
