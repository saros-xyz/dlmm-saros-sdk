import { BN, utils } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

/**
 * Derive PDA for a position account
 */
export function derivePositionPDA(positionMint: PublicKey, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(utils.bytes.utf8.encode('position')), positionMint.toBuffer()],
    programId
  )[0];
}

/**
 * Derive PDA for a hook account
 */
export function deriveHookPDA(hooksConfig: PublicKey, pairAddress: PublicKey, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(utils.bytes.utf8.encode('hook')), hooksConfig.toBuffer(), pairAddress.toBuffer()],
    programId
  )[0];
}

/**
 * Derive PDA for a hook bin array
 */
export function deriveHookBinArrayPDA(hook: PublicKey, index: number, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(utils.bytes.utf8.encode('bin_array')),
      hook.toBuffer(),
      new BN(index).toArrayLike(Buffer, 'le', 4),
    ],
    programId
  )[0];
}

/**
 * Derive PDA for a bin array
 */
export function deriveBinArrayPDA(pair: PublicKey, index: number, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(utils.bytes.utf8.encode('bin_array')),
      pair.toBuffer(),
      new BN(index).toArrayLike(Buffer, 'le', 4),
    ],
    programId
  )[0];
}
