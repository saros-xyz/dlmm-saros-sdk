import { PublicKey } from "@solana/web3.js";
import { MODE } from "../types";

export const RPC_CONFIG = {
  [MODE.TESTNET]: {
    rpc: "https://api.testnet.solana.com",
  },
  [MODE.DEVNET]: {
    rpc: "https://api.devnet.solana.com",
  },
  [MODE.MAINNET]: {
    rpc: "https://api.mainnet-beta.solana.com",
  },
};

export const FIXED_LENGTH = 16;
export const SCALE_OFFSET = 64;
export const BIN_ARRAY_SIZE = 256;
export const ACTIVE_ID = 8388608;

export const MAX_BASIS_POINTS = 10_000;
export const CCU_LIMIT = 400_000;
export const UNIT_PRICE_DEFAULT = 1_000_000;
export const VARIABLE_FEE_PRECISION = 100_000_000_000;

export const BIN_ARRAY_INDEX = ACTIVE_ID / BIN_ARRAY_SIZE - 1;
export const PRECISION_BIGINT = BigInt(1_000_000_000);
export const MAX_BASIS_POINTS_BIGINT = BigInt(MAX_BASIS_POINTS);

export const WRAP_SOL_PUBKEY = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
