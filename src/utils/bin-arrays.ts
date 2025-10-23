import { BN } from '@coral-xyz/anchor';
import { PublicKey, Transaction, Connection } from '@solana/web3.js';
import { BIN_ARRAY_SIZE } from '../constants';
import { SarosDLMMError } from './errors';
import { deriveBinArrayHookPDA, deriveBinArrayPDA } from './pda';

export function calculateBinArrayIndex(binId: number): number {
  return Math.floor(binId / BIN_ARRAY_SIZE);
}

/** Calculate a range of bin array indices around an active binId  */
export function calculateBinArrayRange(activeId: number, arrayRange: number = 1): number[] {
  const activeIndex = calculateBinArrayIndex(activeId);
  const indices: number[] = [];

  for (let i = -Math.floor(arrayRange / 2); i <= Math.floor(arrayRange / 2); i++) {
    indices.push(activeIndex + i);
  }
  return indices;
}

/** Get adjacent bin array addresses (lower and upper) in one call */
export function getBinArrayAddresses(
  binArrayIndex: number,
  pairAddress: PublicKey,
  programId: PublicKey
): { binArrayLower: PublicKey; binArrayUpper: PublicKey } {
  return {
    binArrayLower: deriveBinArrayPDA(binArrayIndex, pairAddress, programId),
    binArrayUpper: deriveBinArrayPDA(binArrayIndex + 1, pairAddress, programId),
  };
}

/** Get bin array reserves with adjacent fallback logic */
export async function getBinArrayWithAdjacent(
  binArrayIndex: number,
  pairAddress: PublicKey,
  lbProgram: any
): Promise<{ bins: any[]; index: number }> {
  const current = deriveBinArrayPDA(binArrayIndex, pairAddress, lbProgram.programId);
  const { bins: currentBins } = await lbProgram.account.binArray.fetch(current);

  try {
    const next = deriveBinArrayPDA(binArrayIndex + 1, pairAddress, lbProgram.programId);
    const { bins: nextBins } = await lbProgram.account.binArray.fetch(next);
    return { bins: [...currentBins, ...nextBins], index: binArrayIndex };
  } catch {
    try {
      const prev = deriveBinArrayPDA(binArrayIndex - 1, pairAddress, lbProgram.programId);
      const { bins: prevBins } = await lbProgram.account.binArray.fetch(prev);
      return { bins: [...prevBins, ...currentBins], index: binArrayIndex - 1 };
    } catch {
      return { bins: currentBins, index: binArrayIndex };
    }
  }
}

/** Get valid bin arrays for swap operations */
export async function getSwapBinArrays(
  activeId: number,
  pairAddress: PublicKey,
  connection: Connection,
  programId: PublicKey
): Promise<{
  binArrayLower: PublicKey;
  binArrayUpper: PublicKey;
  binArrayLowerIndex: number;
  binArrayUpperIndex: number;
}> {
  const currentBinArrayIndex = calculateBinArrayIndex(activeId);
  const surroundingIndexes = [currentBinArrayIndex - 1, currentBinArrayIndex, currentBinArrayIndex + 1];

  const binArrayAddresses = surroundingIndexes.map((idx) => deriveBinArrayPDA(idx, pairAddress, programId));

  try {
    const binArrayAccountsInfo = await connection.getMultipleAccountsInfo(binArrayAddresses);
    const validIndexes = surroundingIndexes.filter((_, i) => binArrayAccountsInfo[i]);

    if (validIndexes.length < 2) {
      const missingAddresses = binArrayAddresses
        .filter((_, i) => !binArrayAccountsInfo[i])
        .map((addr) => addr.toBase58())
        .join(', ');
      throw SarosDLMMError.BinArrayNotFound(missingAddresses);
    }

    let binArrayLowerIndex: number;
    let binArrayUpperIndex: number;

    if (validIndexes.length === 2) {
      [binArrayLowerIndex, binArrayUpperIndex] = validIndexes;
    } else {
      const activeOffset = activeId % BIN_ARRAY_SIZE;
      const [first, second, third] = validIndexes;
      [binArrayLowerIndex, binArrayUpperIndex] = activeOffset < BIN_ARRAY_SIZE / 2 ? [first, second] : [second, third];
    }

    return {
      binArrayLowerIndex,
      binArrayUpperIndex,
      binArrayLower: deriveBinArrayPDA(binArrayLowerIndex, pairAddress, programId),
      binArrayUpper: deriveBinArrayPDA(binArrayUpperIndex, pairAddress, programId),
    };
  } catch (error) {
    SarosDLMMError.handleError(error, SarosDLMMError.BinArrayInfoFailed());
  }
}

/**
 * Get bin arrays for liquidity operations with initialization support
 *
 * IMPORTANT: The program IDL requires bin_array_lower and bin_array_upper to be
 * different writable accounts. Even if a position fits within a single bin array,
 * we must provide two consecutive bin array accounts to satisfy the program's requirements.
 */
export async function getLiquidityBinArrays(
  lowerBinId: number,
  upperBinId: number,
  pairAddress: PublicKey,
  connection: Connection,
  programId: PublicKey,
  payer?: PublicKey,
  lbProgram?: any,
  transaction?: Transaction
): Promise<{ binArrayLower: PublicKey; binArrayUpper: PublicKey }> {
  const lowerIndex = calculateBinArrayIndex(lowerBinId);

  // Always use consecutive bin array indices (lowerIndex and lowerIndex + 1)
  // The program requires two different writable accounts even if the position
  // fits entirely within a single bin array
  const binArrayLower = deriveBinArrayPDA(lowerIndex, pairAddress, programId);
  const binArrayUpper = deriveBinArrayPDA(lowerIndex + 1, pairAddress, programId);

  if (transaction && payer && lbProgram) {
    // Always initialize both consecutive bin arrays
    const indexes = [lowerIndex, lowerIndex + 1];
    const addresses = [binArrayLower, binArrayUpper];

    const accountInfos = await connection.getMultipleAccountsInfo(addresses);
    for (let i = 0; i < indexes.length; i++) {
      if (!accountInfos[i]) {
        const ix = await lbProgram.methods
          .initializeBinArray(new BN(indexes[i]))
          .accountsPartial({ pair: pairAddress, binArray: addresses[i], user: payer })
          .instruction();
        transaction.add(ix);
      }
    }
  }

  return { binArrayLower, binArrayUpper };
}

/** Get bin arrays for quote calculations with fallback handling */
export async function getQuoteBinArrays(
  activeId: number,
  pairAddress: PublicKey,
  lbProgram: any
): Promise<{ binArrays: any[]; binArrayIndexes: number[] }> {
  const currentBinArrayIndex = calculateBinArrayIndex(activeId);
  const binArrayIndexes = [currentBinArrayIndex - 1, currentBinArrayIndex, currentBinArrayIndex + 1];

  const binArrayAddresses = binArrayIndexes.map((idx) => deriveBinArrayPDA(idx, pairAddress, lbProgram.programId));

  const binArrays = await Promise.all(
    binArrayAddresses.map((address, i) =>
      lbProgram.account.binArray.fetch(address).catch(() => ({
        index: binArrayIndexes[i],
        bins: [],
      }))
    )
  );

  return { binArrays, binArrayIndexes };
}

/**
 * Get bin arrays and hook bin arrays for liquidity removal
 * Requires bin_array_lower and bin_array_upper to be distinct accounts.
 */
export function getRemovalBinArrays(
  index: number,
  pairAddress: PublicKey,
  hook: PublicKey,
  lbProgramId: PublicKey,
  hooksProgramId: PublicKey
): {
  binArrayLower: PublicKey;
  binArrayUpper: PublicKey;
  hookBinArrayLower: PublicKey;
  hookBinArrayUpper: PublicKey;
} {
  return {
    binArrayLower: deriveBinArrayPDA(index, pairAddress, lbProgramId),
    binArrayUpper: deriveBinArrayPDA(index + 1, pairAddress, lbProgramId),
    hookBinArrayLower: deriveBinArrayHookPDA(hook, index, hooksProgramId),
    hookBinArrayUpper: deriveBinArrayHookPDA(hook, index + 1, hooksProgramId),
  };
}

/** Initialize multiple bin arrays */
export async function initializeMultipleBinArrays(
  binArrayIndexes: number[],
  pairAddress: PublicKey,
  payer: PublicKey,
  transaction: Transaction,
  connection: Connection,
  lbProgram: any
): Promise<void> {
  if (binArrayIndexes.length === 0) return;

  const binArrayAddresses = binArrayIndexes.map((idx) => deriveBinArrayPDA(idx, pairAddress, lbProgram.programId));

  try {
    const accountInfos = await connection.getMultipleAccountsInfo(binArrayAddresses);
    for (let i = 0; i < binArrayIndexes.length; i++) {
      if (!accountInfos[i]) {
        const ix = await lbProgram.methods
          .initializeBinArray(new BN(binArrayIndexes[i]))
          .accountsPartial({
            pair: pairAddress,
            binArray: binArrayAddresses[i],
            user: payer,
          })
          .instruction();
        transaction.add(ix);
      }
    }
  } catch (error) {
    SarosDLMMError.handleError(error, SarosDLMMError.BinArrayInfoFailed());
  }
}
