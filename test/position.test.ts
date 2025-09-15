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

describe("positionTests", () => {
  it("should return true", async () => {
    expect(true).toBe(true);
  });


});
