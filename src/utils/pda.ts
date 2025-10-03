import { BN, utils } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

export function derivePositionPDA(positionMint: PublicKey, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(utils.bytes.utf8.encode('position')), positionMint.toBuffer()],
    programId
  )[0];
}

export function derivePositionHookPDA(hook: PublicKey, position: PublicKey, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(utils.bytes.utf8.encode('position')), hook.toBuffer(), position.toBuffer()],
    programId
  )[0];
}

export function deriveHookPDA(hooksConfig: PublicKey, pairAddress: PublicKey, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(utils.bytes.utf8.encode('hook')), hooksConfig.toBuffer(), pairAddress.toBuffer()],
    programId
  )[0];
}

export function deriveBinArrayHookPDA(hook: PublicKey, index: number, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(utils.bytes.utf8.encode('bin_array')), hook.toBuffer(), new BN(index).toArrayLike(Buffer, 'le', 4)],
    programId
  )[0];
}

export function deriveBinArrayPDA(index: number, pair: PublicKey, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(utils.bytes.utf8.encode('bin_array')), pair.toBuffer(), new BN(index).toArrayLike(Buffer, 'le', 4)],
    programId
  )[0];
}

export function deriveBinStepConfigPDA(lbConfig: PublicKey, binStep: number, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(utils.bytes.utf8.encode('bin_step_config')), lbConfig.toBuffer(), new Uint8Array([binStep])],
    programId
  )[0];
}

export function deriveQuoteAssetBadgePDA(lbConfig: PublicKey, tokenY: PublicKey, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(utils.bytes.utf8.encode('quote_asset_badge')), lbConfig.toBuffer(), tokenY.toBuffer()],
    programId
  )[0];
}
