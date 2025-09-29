import { PublicKey, Connection, Transaction } from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import { WRAP_SOL_ADDRESS } from "../constants";
import { DLMMError } from "../error";

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
 * Helper to determine token program from account info
 */
export function getTokenProgramFromAccountInfo(address: PublicKey, accountInfo: any): PublicKey {
  // WSOL is always legacy SPL
  if (address.equals(new PublicKey(WRAP_SOL_ADDRESS))) {
    return spl.TOKEN_PROGRAM_ID;
  }

  if (!accountInfo) {
    throw new DLMMError("Token mint account not found", "TOKEN_MINT_NOT_FOUND");
  }

  const owner = accountInfo.owner.toBase58();
  return owner === spl.TOKEN_PROGRAM_ID.toBase58() ? spl.TOKEN_PROGRAM_ID : spl.TOKEN_2022_PROGRAM_ID;
}

/**
 * Get both pair token account info.
 * If createVaultsIfNeeded is true: creates missing vault accounts (i.e in createPair)
 */
export async function getPairTokenAccounts(
  tokenMintX: PublicKey,
  tokenMintY: PublicKey,
  pairAddress: PublicKey,
  connection: Connection,
  options?: {
    payer?: PublicKey;
    transaction?: Transaction;
    createVaultsIfNeeded?: boolean;
  }
): Promise<PairTokenAccountsResult> {
  try {
    // Step 1: Get token programs for both tokens
    const mintAccountInfos = await connection.getMultipleAccountsInfo([tokenMintX, tokenMintY]);

    if (!mintAccountInfos[0]) {
      throw new DLMMError("Token mint not found", "TOKEN_MINT_X_NOT_FOUND");
    }
    if (!mintAccountInfos[1]) {
      throw new DLMMError("Token mint not found", "TOKEN_MINT_Y_NOT_FOUND");
    }

    const tokenProgramX = getTokenProgramFromAccountInfo(tokenMintX, mintAccountInfos[0]);
    const tokenProgramY = getTokenProgramFromAccountInfo(tokenMintY, mintAccountInfos[1]);

    // Step 2: Calculate vault addresses
    const vaultX = spl.getAssociatedTokenAddressSync(tokenMintX, pairAddress, true, tokenProgramX);
    const vaultY = spl.getAssociatedTokenAddressSync(tokenMintY, pairAddress, true, tokenProgramY);

    // Step 3: Optionally create vault accounts if missing
    if (options?.createVaultsIfNeeded && options.payer && options.transaction) {
      const vaultAccountInfos = await connection.getMultipleAccountsInfo([vaultX, vaultY]);

      if (!vaultAccountInfos[0]) {
        const createVaultXIx = spl.createAssociatedTokenAccountInstruction(
          options.payer,
          vaultX,
          pairAddress,
          tokenMintX,
          tokenProgramX
        );
        options.transaction.add(createVaultXIx);
      }

      if (!vaultAccountInfos[1]) {
        const createVaultYIx = spl.createAssociatedTokenAccountInstruction(
          options.payer,
          vaultY,
          pairAddress,
          tokenMintY,
          tokenProgramY
        );
        options.transaction.add(createVaultYIx);
      }
    }

    // Step 4: Get mint decimals + vault balances
    const allAccounts = [tokenMintX, tokenMintY, vaultX, vaultY];
    const parsedAccountsResponse = await connection.getMultipleParsedAccounts(allAccounts);
    const parsedAccounts = parsedAccountsResponse.value;

    const [mintXInfo, mintYInfo, vaultXInfo, vaultYInfo] = parsedAccounts;

    const baseDecimals =
      mintXInfo?.data && "parsed" in mintXInfo.data ? (mintXInfo.data.parsed.info.decimals ?? 0) : 0;

    const quoteDecimals =
      mintYInfo?.data && "parsed" in mintYInfo.data ? (mintYInfo.data.parsed.info.decimals ?? 0) : 0;

    const reserveX =
      vaultXInfo?.data && "parsed" in vaultXInfo.data
        ? {
            value: {
              amount: vaultXInfo.data.parsed.info.tokenAmount.amount,
              decimals: vaultXInfo.data.parsed.info.tokenAmount.decimals,
            },
          }
        : { value: { amount: "0", decimals: baseDecimals } };

    const reserveY =
      vaultYInfo?.data && "parsed" in vaultYInfo.data
        ? {
            value: {
              amount: vaultYInfo.data.parsed.info.tokenAmount.amount,
              decimals: vaultYInfo.data.parsed.info.tokenAmount.decimals,
            },
          }
        : { value: { amount: "0", decimals: quoteDecimals } };

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
  } catch (_error) {
    throw new DLMMError("Failed to fetch pair token accounts", "PAIR_ACCOUNTS_FETCH_FAILED");
  }
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
  try {
    const mintAccountInfos = await connection.getMultipleAccountsInfo([tokenMintX, tokenMintY]);

    if (!mintAccountInfos[0]) {
      throw new DLMMError("Token mint not found", "TOKEN_MINT_X_NOT_FOUND");
    }
    if (!mintAccountInfos[1]) {
      throw new DLMMError("Token mint not found", "TOKEN_MINT_Y_NOT_FOUND");
    }

    const tokenProgramX = getTokenProgramFromAccountInfo(tokenMintX, mintAccountInfos[0]);
    const tokenProgramY = getTokenProgramFromAccountInfo(tokenMintY, mintAccountInfos[1]);

    const vaultX = spl.getAssociatedTokenAddressSync(tokenMintX, payer, true, tokenProgramX);
    const vaultY = spl.getAssociatedTokenAddressSync(tokenMintY, payer, true, tokenProgramY);

    if (transaction) {
      const vaultAccountInfos = await connection.getMultipleAccountsInfo([vaultX, vaultY]);

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
  } catch (_error) {
    throw new DLMMError("Failed to fetch user vaults", "USER_VAULTS_FETCH_FAILED");
  }
}
