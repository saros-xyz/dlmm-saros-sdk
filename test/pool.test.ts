import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { LiquidityBookServices } from "../services/core";
import { MODE } from "../types";

const lbServices = new LiquidityBookServices({
  mode: MODE.MAINNET,
  options: {
    rpcUrl: "https://api.mainnet-beta.solana.com",
  },
});

describe("getPoolMetadata", () => {
  it("should fetch and validate metadata for USDC/USDT Pool", async () => {
    const poolId = "9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk"; // USDC/USDT
    const metadata = await lbServices.getPoolMetadata(poolId);
    expect(metadata).toBeDefined();
    expect(metadata.poolAddress).toBe(poolId);
    expect(typeof metadata.baseToken.mintAddress).toBe("string");
    expect(typeof metadata.quoteToken.mintAddress).toBe("string");
    expect(metadata.baseToken.mintAddress).not.toBe(
      metadata.quoteToken.mintAddress
    );
    expect(metadata.baseToken.decimals).toBe(6); // USDC standard
    expect(metadata.quoteToken.decimals).toBe(6); // USDT standard
  });

  it("should fetch and validate metadata for SOL/USDC Pool", async () => {
    const poolId = "8vZHTVMdYvcPFUoHBEbcFyfSKnjWtvbNgYpXg1aiC2uS"; // SOL/USDC
    const metadata = await lbServices.getPoolMetadata(poolId);
    expect(metadata).toBeDefined();
    expect(metadata.poolAddress).toBe(poolId);
    expect(typeof metadata.baseToken.mintAddress).toBe("string");
    expect(typeof metadata.quoteToken.mintAddress).toBe("string");
    expect(metadata.baseToken.mintAddress).not.toBe(
      metadata.quoteToken.mintAddress
    );
    expect(metadata.baseToken.decimals).toBe(9); // SOL standard
    expect(metadata.quoteToken.decimals).toBe(6); // USDC standard
    expect(metadata.baseToken.mintAddress.toString()).toBe(
      "So11111111111111111111111111111111111111112"
    ); // SOL mint
    expect(metadata.quoteToken.mintAddress.toString()).toBe(
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    ); // USDC mint
  });
});

describe("getAllPoolAddresses", () => {
  it("should fetch all pool addresses from the program", async () => {
    const poolAddresses = await lbServices.getAllPoolAddresses();
    expect(poolAddresses).toBeDefined();
    expect(Array.isArray(poolAddresses)).toBe(true);
    console.log(poolAddresses.length);
    expect(poolAddresses.length).toBeGreaterThan(0);

    // Each item should be string address
    poolAddresses.forEach((item) => {
      expect(item).toBeDefined();
      expect(typeof item).toBe("string");
    });
  });
});

describe("getPairAccount", () => {
  it("should fetch and validate pair account type for USDC/USDT Pool", async () => {
    const poolId = "9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk"; // USDC/USDT
    const pairAccount = await lbServices.getPairAccount(new PublicKey(poolId));

    expect(pairAccount).toBeDefined();
    expect(pairAccount.bump).toBeInstanceOf(Array);
    expect(pairAccount.bump.length).toBe(1);
    expect(typeof pairAccount.binStep).toBe("number");
    expect(pairAccount.binStepSeed).toBeInstanceOf(Array);
    expect(pairAccount.tokenMintX).toBeInstanceOf(PublicKey);
    expect(pairAccount.tokenMintY).toBeInstanceOf(PublicKey);
    expect(typeof pairAccount.activeId).toBe("number");

    // Validate staticFeeParameters structure
    expect(pairAccount.staticFeeParameters).toBeDefined();
    expect(typeof pairAccount.staticFeeParameters.baseFactor).toBe("number");
    expect(typeof pairAccount.staticFeeParameters.filterPeriod).toBe("number");
    expect(typeof pairAccount.staticFeeParameters.decayPeriod).toBe("number");
    expect(typeof pairAccount.staticFeeParameters.reductionFactor).toBe(
      "number"
    );
    expect(typeof pairAccount.staticFeeParameters.variableFeeControl).toBe(
      "number"
    );
    expect(
      typeof pairAccount.staticFeeParameters.maxVolatilityAccumulator
    ).toBe("number");
    expect(typeof pairAccount.staticFeeParameters.protocolShare).toBe("number");
    expect(pairAccount.staticFeeParameters.space).toBeInstanceOf(Array);
    expect(pairAccount.staticFeeParameters.space.length).toBe(2);

    // Validate dynamicFeeParameters structure
    expect(pairAccount.dynamicFeeParameters).toBeDefined();
    expect(pairAccount.dynamicFeeParameters.timeLastUpdated).toBeDefined(); // BN object
    expect(typeof pairAccount.dynamicFeeParameters.volatilityAccumulator).toBe(
      "number"
    );
    expect(typeof pairAccount.dynamicFeeParameters.volatilityReference).toBe(
      "number"
    );
    expect(typeof pairAccount.dynamicFeeParameters.idReference).toBe("number");
    expect(pairAccount.dynamicFeeParameters.space).toBeInstanceOf(Array);
    expect(pairAccount.dynamicFeeParameters.space.length).toBe(4);

    // Validate protocol fees are BN objects
    expect(pairAccount.protocolFeesX).toBeDefined();
    expect(pairAccount.protocolFeesY).toBeDefined();

    // Hook can be null or PublicKey
    if (pairAccount.hook !== null) {
      expect(pairAccount.hook).toBeInstanceOf(PublicKey);
    }
  });

  it("should throw error for invalid pair address", async () => {
    const invalidPairId = "11111111111111111111111111111111"; // Invalid address

    await expect(
      lbServices.getPairAccount(new PublicKey(invalidPairId))
    ).rejects.toThrow();
  });
});
