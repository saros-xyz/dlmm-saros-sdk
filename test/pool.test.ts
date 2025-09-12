import { describe, expect, it } from "vitest";
import { LiquidityBookServices } from "../services/core";
import { MODE } from "../types";

const lbServices = new LiquidityBookServices({
  mode: MODE.MAINNET,
  options: {
    rpcUrl: "https://api.mainnet-beta.solana.com",
  },
});

describe("fetchPoolMetadata", () => {
  it("should fetch and validate metadata for USDC/USDT Pool", async () => {
    const poolId = "9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk"; // USDC/USDT
    const metadata = await lbServices.fetchPoolMetadata(poolId);
    expect(metadata).toBeDefined();
    expect(metadata.poolAddress).toBe(poolId);
    expect(typeof metadata.baseMint).toBe("string");
    expect(typeof metadata.quoteMint).toBe("string");
    expect(metadata.baseMint).not.toBe(metadata.quoteMint);
    expect(metadata.extra.tokenBaseDecimal).toBe(6); // USDC standard
    expect(metadata.extra.tokenQuoteDecimal).toBe(6); // USDT standard
  });

 it("should fetch and validate metadata for SOL/USDC Pool", async () => {
    const poolId = "8vZHTVMdYvcPFUoHBEbcFyfSKnjWtvbNgYpXg1aiC2uS"; // SOL/USDC
    const metadata = await lbServices.fetchPoolMetadata(poolId);
    console.log(metadata);
    expect(metadata).toBeDefined();
    expect(metadata.poolAddress).toBe(poolId);
    expect(typeof metadata.baseMint).toBe("string");
    expect(typeof metadata.quoteMint).toBe("string");
    expect(metadata.baseMint).not.toBe(metadata.quoteMint);
    expect(metadata.extra.tokenBaseDecimal).toBe(9); // SOL standard
    expect(metadata.extra.tokenQuoteDecimal).toBe(6); // USDC standard
  });
});