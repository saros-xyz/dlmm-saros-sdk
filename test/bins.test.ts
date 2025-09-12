import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiquidityBookServices } from "../services/core";
import { BinAccount, MODE } from "../types";

describe("getBinsReserveInformation", () => {
  let service: LiquidityBookServices;
  let mockPositionInfo: any;
  let mockBinArrayInfo: any;

  beforeEach(() => {
    service = new LiquidityBookServices({ mode: MODE.MAINNET });

    // Mock the position info
    mockPositionInfo = {
      lowerBinId: 100,
      upperBinId: 102,
      liquidityShares: [
        new BN("1000000000"), // 1 token
        new BN("2000000000"), // 2 tokens
        new BN("1500000000"), // 1.5 tokens
      ],
    };

    // Create proper BinAccount objects
    const mockBin1: BinAccount = {
      reserveX: new BN("5000000000"),
      reserveY: new BN("3000000000"),
      totalSupply: new BN("10000000000"),
    };

    const mockBin2: BinAccount = {
      reserveX: new BN("8000000000"),
      reserveY: new BN("4000000000"),
      totalSupply: new BN("20000000000"),
    };

    // Mock bin array info - treating bins as object-like array access
    mockBinArrayInfo = {
      bins: [mockBin1, mockBin2], // Array but we'll mock array access differently
      resultIndex: 0,
    };

    // Mock the service methods
    vi.spyOn(service, "getPositionAccount").mockResolvedValue(mockPositionInfo);
    vi.spyOn(service, "getBinArrayInfo").mockResolvedValue(mockBinArrayInfo);
  });

  it("should return correct reserve information with proper types", async () => {
    const params = {
      position: PublicKey.default,
      pair: PublicKey.default,
      payer: PublicKey.default,
    };

    const result = await service.getBinsReserveInformation(params);

    // Should return array with 3 elements (upperBinId - lowerBinId + 1)
    expect(result).toHaveLength(3);

    // Verify BN types are preserved for all elements
    result.forEach(bin => {
      expect(typeof bin.reserveX).toBe("number");
      expect(typeof bin.reserveY).toBe("number");
      expect(bin.totalSupply).toBeInstanceOf(BN);
      expect(bin.liquidityShare).toBeInstanceOf(BN);
      expect(typeof bin.binId).toBe("number");
      expect(typeof bin.binPosistion).toBe("number");
    });

    // Check specific values for first bin
    expect(result[0].liquidityShare.toString()).toBe("1000000000");
    expect(result[1].liquidityShare.toString()).toBe("2000000000");
    expect(result[2].liquidityShare.toString()).toBe("1500000000");
  });

  it("should handle bins with zero reserves correctly", async () => {
    const mockBinWithZeros: BinAccount = {
      reserveX: new BN("0"),
      reserveY: new BN("0"),
      totalSupply: new BN("1000000000"),
    };

    vi.spyOn(service, "getBinArrayInfo").mockResolvedValue({
      bins: [mockBinWithZeros],
      resultIndex: 0,
    });

    const params = {
      position: PublicKey.default,
      pair: PublicKey.default,
      payer: PublicKey.default,
    };

    const result = await service.getBinsReserveInformation(params);

    // Should handle zero reserves without calling mulDivBN
    expect(result[0].reserveX).toBe(0);
    expect(result[0].reserveY).toBe(0);
    expect(result[0].totalSupply).toBeInstanceOf(BN);
    expect(result[0].totalSupply.toString()).toBe("0"); // Since no activeBin, defaults to "0"
  });

  it("should handle missing bins (undefined access)", async () => {
    // Mock empty bins array to simulate missing bin data
    vi.spyOn(service, "getBinArrayInfo").mockResolvedValue({
      bins: [], // Empty array means bins[binId] will be undefined
      resultIndex: 0,
    });

    const params = {
      position: PublicKey.default,
      pair: PublicKey.default,
      payer: PublicKey.default,
    };

    const result = await service.getBinsReserveInformation(params);

    // All bins should have zero reserves but preserve liquidityShare types
    result.forEach((bin, index) => {
      expect(bin.reserveX).toBe(0);
      expect(bin.reserveY).toBe(0);
      expect(bin.totalSupply).toEqual(new BN("0"));
      expect(bin.liquidityShare).toBeInstanceOf(BN);
      expect(bin.binId).toBe(100 + index);
    });
  });

  it("should maintain type consistency between success and failure cases", async () => {
    const params = {
      position: PublicKey.default,
      pair: PublicKey.default,
      payer: PublicKey.default,
    };

    const result = await service.getBinsReserveInformation(params);

    // Verify all elements have consistent types regardless of whether bin exists
    result.forEach(bin => {
      expect(typeof bin.reserveX).toBe("number");
      expect(typeof bin.reserveY).toBe("number");
      expect(bin.totalSupply).toBeInstanceOf(BN);
      expect(bin.liquidityShare).toBeInstanceOf(BN);
      expect(typeof bin.binId).toBe("number");
      expect(typeof bin.binPosistion).toBe("number");
    });
  });
});
