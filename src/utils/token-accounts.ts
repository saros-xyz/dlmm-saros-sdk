import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { WRAP_SOL_PUBKEY } from '../constants';

export interface PairTokenAccountsResult {
  vaultX: PublicKey;
  vaultY: PublicKey;
  tokenProgramX: PublicKey;
  tokenProgramY: PublicKey;
  reserveX: { value: { amount: string; decimals: number } };
  reserveY: { value: { amount: string; decimals: number } };
  baseDecimals: number;
  quoteDecimals: number;
}

/**
 * Get both pair token account info
 * Uses getMultipleParsedAccounts to get everything we need efficiently
 */
export async function getPairTokenAccounts(
  tokenMintX: PublicKey,
  tokenMintY: PublicKey,
  pairAddress: PublicKey,
  connection: Connection
): Promise<PairTokenAccountsResult> {
  // Step 1: Get token programs for both tokens
  const mintAccountInfos = await connection.getMultipleAccountsInfo([tokenMintX, tokenMintY]);

  const tokenProgramX = getTokenProgramFromAccountInfo(tokenMintX, mintAccountInfos[0]);
  const tokenProgramY = getTokenProgramFromAccountInfo(tokenMintY, mintAccountInfos[1]);

  // Step 2: Calculate vault addresses
  const vaultX = spl.getAssociatedTokenAddressSync(tokenMintX, pairAddress, true, tokenProgramX);

  const vaultY = spl.getAssociatedTokenAddressSync(tokenMintY, pairAddress, true, tokenProgramY);

  // Step 3: Get mint decimals + vault balances
  const allAccounts = [tokenMintX, tokenMintY, vaultX, vaultY];
  const parsedAccountsResponse = await connection.getMultipleParsedAccounts(allAccounts);
  const parsedAccounts = parsedAccountsResponse.value;

  const [mintXInfo, mintYInfo, vaultXInfo, vaultYInfo] = parsedAccounts;

  // Extract decimals from mint info
  const baseDecimals =
    mintXInfo?.data && 'parsed' in mintXInfo.data ? (mintXInfo.data.parsed.info.decimals ?? 0) : 0;

  const quoteDecimals =
    mintYInfo?.data && 'parsed' in mintYInfo.data ? (mintYInfo.data.parsed.info.decimals ?? 0) : 0;

  // Extract vault balances from parsed token account info
  const reserveX =
    vaultXInfo?.data && 'parsed' in vaultXInfo.data
      ? {
          value: {
            amount: vaultXInfo.data.parsed.info.tokenAmount.amount,
            decimals: vaultXInfo.data.parsed.info.tokenAmount.decimals,
          },
        }
      : { value: { amount: '0', decimals: 0 } };

  const reserveY =
    vaultYInfo?.data && 'parsed' in vaultYInfo.data
      ? {
          value: {
            amount: vaultYInfo.data.parsed.info.tokenAmount.amount,
            decimals: vaultYInfo.data.parsed.info.tokenAmount.decimals,
          },
        }
      : { value: { amount: '0', decimals: 0 } };

  return {
    vaultX,
    vaultY,
    tokenProgramX,
    tokenProgramY,
    reserveX,
    reserveY,
    baseDecimals,
    quoteDecimals,
  };
}

/**
 * Get both user vault addresses for tokenX and tokenY
 */
export async function getUserVaults(
  tokenMintX: PublicKey,
  tokenMintY: PublicKey,
  payer: PublicKey,
  connection: Connection,
  transaction?: Transaction
): Promise<{ userVaultX: PublicKey; userVaultY: PublicKey }> {
  // Step 1: Get token programs for both tokens
  const mintAccountInfos = await connection.getMultipleAccountsInfo([tokenMintX, tokenMintY]);

  const tokenProgramX = getTokenProgramFromAccountInfo(tokenMintX, mintAccountInfos[0]);
  const tokenProgramY = getTokenProgramFromAccountInfo(tokenMintY, mintAccountInfos[1]);

  // Step 2: Calculate vault addresses
  const vaultX = spl.getAssociatedTokenAddressSync(tokenMintX, payer, true, tokenProgramX);
  const vaultY = spl.getAssociatedTokenAddressSync(tokenMintY, payer, true, tokenProgramY);

  // Step 3: Check if vaults exist and add create instructions if needed
  if (transaction) {
    const vaultAccountInfos = await connection.getMultipleAccountsInfo([vaultX, vaultY]);

    // Add create ATA instruction for vaultX if it doesn't exist
    if (!vaultAccountInfos[0]) {
      const createVaultXIx = spl.createAssociatedTokenAccountInstruction(
        payer,
        vaultX,
        payer,
        tokenMintX,
        tokenProgramX
      );
      transaction.add(createVaultXIx);
    }

    // Add create ATA instruction for vaultY if it doesn't exist
    if (!vaultAccountInfos[1]) {
      const createVaultYIx = spl.createAssociatedTokenAccountInstruction(
        payer,
        vaultY,
        payer,
        tokenMintY,
        tokenProgramY
      );
      transaction.add(createVaultYIx);
    }
  }

  return { userVaultX: vaultX, userVaultY: vaultY };
}

/**
 * Helper to determine token program from account info
 */
function getTokenProgramFromAccountInfo(address: PublicKey, accountInfo: any): PublicKey {
  // Special-case: WSOL is always legacy SPL
  if (address.equals(WRAP_SOL_PUBKEY)) {
    return spl.TOKEN_PROGRAM_ID;
  }

  if (!accountInfo) {
    throw new Error(`Account info not found for ${address.toBase58()}`);
  }

  const owner = accountInfo.owner.toBase58();
  return owner === spl.TOKEN_PROGRAM_ID.toBase58()
    ? spl.TOKEN_PROGRAM_ID
    : spl.TOKEN_2022_PROGRAM_ID;
}
