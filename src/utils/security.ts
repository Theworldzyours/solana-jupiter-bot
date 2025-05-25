import * as crypto from 'crypto';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import * as fs from 'fs';

/**
 * Security utilities for the Solana Jupiter Bot
 * Provides secure key management and validation functions
 */

/**
 * Interface for the encrypted wallet data
 */
interface EncryptedWallet {
  iv: string;
  encryptedData: string;
}

/**
 * Securely load a wallet from an encrypted file
 * @param filePath Path to the encrypted wallet file
 * @param password Password to decrypt the wallet
 * @returns Solana keypair
 */
export function loadEncryptedWallet(filePath: string, password: string): Keypair {
  try {
    // Read encrypted wallet data
    const encryptedData = JSON.parse(fs.readFileSync(filePath, 'utf8')) as EncryptedWallet;
    
    // Decrypt wallet
    const privateKey = decryptData(encryptedData, password);
    
    // Create keypair from private key
    return Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
  } catch (error) {
    throw new Error(`Failed to load encrypted wallet: ${error}`);
  }
}

/**
 * Save a wallet to an encrypted file
 * @param keypair Solana keypair to encrypt
 * @param filePath Path to save the encrypted wallet
 * @param password Password to encrypt the wallet
 */
export function saveEncryptedWallet(keypair: Keypair, filePath: string, password: string): void {
  try {
    // Convert keypair to hex string
    const privateKeyHex = Buffer.from(keypair.secretKey).toString('hex');
    
    // Encrypt private key
    const encryptedData = encryptData(privateKeyHex, password);
    
    // Save encrypted data
    fs.writeFileSync(filePath, JSON.stringify(encryptedData));
  } catch (error) {
    throw new Error(`Failed to save encrypted wallet: ${error}`);
  }
}

/**
 * Encrypt data using AES-256-GCM
 * @param data Data to encrypt
 * @param password Password to use for encryption
 * @returns Encrypted data object with IV
 */
export function encryptData(data: string, password: string): EncryptedWallet {
  // Generate initialization vector
  const iv = crypto.randomBytes(16);
  
  // Generate key from password
  const key = crypto.scryptSync(password, 'salt', 32);
  
  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  // Encrypt data
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return encrypted data with IV
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData Encrypted data object with IV
 * @param password Password to use for decryption
 * @returns Decrypted data
 */
export function decryptData(encryptedData: EncryptedWallet, password: string): string {
  // Get IV from encrypted data
  const iv = Buffer.from(encryptedData.iv, 'hex');
  
  // Generate key from password
  const key = crypto.scryptSync(password, 'salt', 32);
  
  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  
  // Decrypt data
  let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Convert a private key to various formats
 */
export function formatPrivateKey(privateKey: string): { base58: string; hex: string; array: number[] } {
  // Check if the key is already in base58 format
  let privateKeyUint8Array: Uint8Array;
  
  try {
    privateKeyUint8Array = bs58.decode(privateKey);
  } catch (error) {
    // If it's not base58, try hex
    try {
      privateKeyUint8Array = Buffer.from(privateKey, 'hex');
    } catch (error) {
      throw new Error('Invalid private key format');
    }
  }
  
  // Convert to different formats
  const base58 = bs58.encode(privateKeyUint8Array);
  const hex = Buffer.from(privateKeyUint8Array).toString('hex');
  const array = Array.from(privateKeyUint8Array);
  
  return { base58, hex, array };
}

/**
 * Validate a Solana address
 * @param address Solana address to validate
 * @returns True if the address is valid, false otherwise
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    // Try to decode the address
    const decoded = bs58.decode(address);
    
    // Check if it's a valid public key length (32 bytes)
    return decoded.length === 32;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a random wallet
 * @returns Newly created Solana keypair
 */
export function generateWallet(): Keypair {
  return Keypair.generate();
}

/**
 * Mask a private key for display
 * @param privateKey Private key to mask
 * @returns Masked private key
 */
export function maskPrivateKey(privateKey: string): string {
  if (privateKey.length < 10) {
    return '******';
  }
  
  return privateKey.slice(0, 4) + '...' + privateKey.slice(-4);
}