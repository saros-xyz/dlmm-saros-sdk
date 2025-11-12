import { DLMMPairAccount } from '../types';
import {
  VARIABLE_FEE_PRECISION_BIGINT,
  PRECISION_BIGINT,
  MAX_BASIS_POINTS_BIGINT,
  WRAP_SOL_PUBKEY,
} from '../constants';
import { getMint, getTransferFeeConfig, TOKEN_2022_PROGRAM_ID, TransferFee } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';

export interface FeeCalculationResult {
  baseFee: number;
  variableFee: number;
  dynamicFee: number;
  protocolFee: number;
}

export function getVariableFee(pairInfo: DLMMPairAccount, volatilityAccumulator: number): bigint {
  const variableFeeControl = BigInt(pairInfo.staticFeeParameters.variableFeeControl);
  if (variableFeeControl > 0n) {
    const prod = BigInt(Math.floor(volatilityAccumulator * pairInfo.binStep));
    const variableFee =
      (prod * prod * variableFeeControl + VARIABLE_FEE_PRECISION_BIGINT - 1n) / VARIABLE_FEE_PRECISION_BIGINT;
    return variableFee;
  }
  return variableFeeControl;
}

export function getBaseFee(binStep: number, baseFactor: number): bigint {
  return BigInt(binStep) * BigInt(baseFactor) * 10n;
}

export function getFeeForAmount(amount: bigint, fee: bigint): bigint {
  const denominator = PRECISION_BIGINT - fee;
  const feeForAmount = (amount * fee + denominator - 1n) / denominator;
  return feeForAmount;
}

export function getFeeAmount(amount: bigint, fee: bigint): bigint {
  const feeAmount = (amount * fee + PRECISION_BIGINT - 1n) / PRECISION_BIGINT;
  return feeAmount;
}

export function getProtocolFee(fee: bigint, protocolShare: bigint): bigint {
  const protocolFee = (fee * protocolShare) / MAX_BASIS_POINTS_BIGINT;
  return protocolFee;
}

export function getTotalFee(pairInfo: DLMMPairAccount, volatilityAccumulator: number): bigint {
  return (
    getBaseFee(pairInfo.binStep, pairInfo.staticFeeParameters.baseFactor) +
    getVariableFee(pairInfo, volatilityAccumulator)
  );
}

export function getFeeMetadata(pairAccount: DLMMPairAccount) {
  const { binStep, staticFeeParameters, dynamicFeeParameters } = pairAccount;
  const { baseFactor, protocolShare } = staticFeeParameters;
  const { volatilityAccumulator } = dynamicFeeParameters;

  // Base fee raw
  const baseFeeRaw = getBaseFee(binStep, baseFactor);

  // Variable fee raw
  const variableFeeRaw = getVariableFee(pairAccount, volatilityAccumulator);

  // Dynamic fee raw = max(baseFee, variableFee)
  const dynamicFeeRaw = baseFeeRaw > variableFeeRaw ? baseFeeRaw : variableFeeRaw;

  // Protocol fee raw
  const protocolFeeRaw = getProtocolFee(dynamicFeeRaw, BigInt(protocolShare));

  // Convert to percentages (raw)
  const baseFee = (Number(baseFeeRaw) / Number(PRECISION_BIGINT)) * 100;
  const dynamicFee = (Number(dynamicFeeRaw) / Number(PRECISION_BIGINT)) * 100;
  const protocolFee = (Number(protocolFeeRaw) / Number(PRECISION_BIGINT)) * 100;

  return {
    baseFee,
    dynamicFee,
    protocolFee,
  };
}

export async function getTransferFeeFromOnchain({
  mintToken,
  connection,
}: {
  mintToken: PublicKey;
  connection: Connection;
}): Promise<TransferFee | null> {
  try {
    if (mintToken.equals(WRAP_SOL_PUBKEY)) {
      return null;
    }
    const mintInfo = await getMint(connection, mintToken, undefined, TOKEN_2022_PROGRAM_ID);
    const transferFeeConfig = getTransferFeeConfig(mintInfo);

    if (!transferFeeConfig) {
      return null; // No transfer fee extension
    }

    // Get current epoch to determine which fee to use
    const epochInfo = await connection.getEpochInfo();
    const currentEpoch = BigInt(epochInfo.epoch);

    // Determine current active transfer fee based on epoch
    const currentTransferFee =
      currentEpoch >= transferFeeConfig.newerTransferFee.epoch
        ? transferFeeConfig.newerTransferFee
        : transferFeeConfig.olderTransferFee;

    const feeConfig: TransferFee = {
      epoch: currentTransferFee.epoch,
      maximumFee: currentTransferFee.maximumFee,
      transferFeeBasisPoints: currentTransferFee.transferFeeBasisPoints,
    };

    return feeConfig;
  } catch (error) {
    throw new Error(error as string);
  }
}
