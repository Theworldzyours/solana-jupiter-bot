import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Token } from "../interfaces/config";

/**
 * Utility functions for handling tokens
 */
export class TokenUtils {
	/**
	 * Get token balance for a wallet
	 * @param connection Solana connection
	 * @param walletAddress Wallet public key
	 * @param token Token to check balance
	 * @returns Token balance in human readable format
	 */
	public static async getTokenBalance(
		connection: Connection,
		walletAddress: PublicKey,
		token: Token,
	): Promise<number> {
		try {
			// Handle SOL native token
			if (token.address === "So11111111111111111111111111111111111111112") {
				const balance = await connection.getBalance(walletAddress);
				return balance / 10 ** token.decimals;
			}

			// Find token account
			const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
				walletAddress,
				{
					programId: TOKEN_PROGRAM_ID,
				},
			);

			// Find the token account for the specific token
			const tokenAccount = tokenAccounts.value.find(
				(account) => account.account.data.parsed.info.mint === token.address,
			);

			if (!tokenAccount) {
				return 0;
			}

			// Get balance
			const balance =
				tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;

			return balance;
		} catch (error) {
			console.error("Error getting token balance:", error);
			return 0;
		}
	}

	/**
	 * Check if wallet has sufficient balance for a trade
	 * @param connection Solana connection
	 * @param walletAddress Wallet public key
	 * @param token Token to check
	 * @param amount Amount required
	 * @returns True if sufficient balance, false otherwise
	 */
	public static async hasSufficientBalance(
		connection: Connection,
		walletAddress: PublicKey,
		token: Token,
		amount: number,
	): Promise<boolean> {
		const balance = await this.getTokenBalance(
			connection,
			walletAddress,
			token,
		);
		return balance >= amount;
	}

	/**
	 * Get token info from mint address
	 * @param connection Solana connection
	 * @param mintAddress Token mint address
	 * @returns Token information
	 */
	public static async getTokenInfo(
		connection: Connection,
		mintAddress: string,
	): Promise<Token | null> {
		try {
			// Fetch token data from chain
			const tokenMint = new PublicKey(mintAddress);
			const tokenInfo = await connection.getParsedAccountInfo(tokenMint);

			if (!tokenInfo || !tokenInfo.value) {
				return null;
			}

			// Get decimals
			const parsedData = tokenInfo.value.data as any;
			const decimals = parsedData.parsed?.info?.decimals || 0;

			// Create token object
			return {
				address: mintAddress,
				symbol: "", // Symbol not available from chain
				name: "", // Name not available from chain
				decimals,
			};
		} catch (error) {
			console.error("Error getting token info:", error);
			return null;
		}
	}
}
