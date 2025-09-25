import { describe, expect, it } from 'vitest';
import { PublicKey, Keypair } from '@solana/web3.js';
import { ACTIVE_ID } from '../../constants';
import { LiquidityManager } from '../../utils/position/liquidity';
import { SarosDLMM } from '../../services';
import { MODE, PositionBinBalance, RemoveLiquidityType } from '../../types';

const config = {
  mode: MODE.MAINNET,
  options: {
    rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  },
};

const USDC_USDT = '9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk';
// any wallet with a DLMM position open
const TEST_WALLET = new PublicKey('4VGLP8wqFEHEoh8vjgYCMsUbZ6LtuYrxcJv226qCWNuT');

describe('Position Operations', () => {
  it('fetches user positions for pool', async () => {
    const pair = await SarosDLMM.createPair(config, new PublicKey(USDC_USDT));
    const positions = await pair.getUserPositions({
      payer: TEST_WALLET,
    });

    // console.log(positions);
    expect(Array.isArray(positions)).toBe(true);
    expect(positions.length).toBeGreaterThan(0);

    positions.forEach((position) => {
      expect(position.upperBinId).toBeGreaterThanOrEqual(position.lowerBinId);
    });
  });

  it('handles wallet with no positions', async () => {
    const pair = await SarosDLMM.createPair(config, new PublicKey(USDC_USDT));
    const positions = await pair.getUserPositions({
      payer: Keypair.generate().publicKey,
    });

    expect(positions).toEqual([]);
  });
});

describe('LiquidityHelper Logic', () => {
  const mockPositionReserves: PositionBinBalance[] = [
    {
      baseReserve: 1000000n, // 1 USDC (6 decimals)
      quoteReserve: 0n,
      totalSupply: 5000000n,
      binId: ACTIVE_ID,
      binPosition: 0,
      liquidityShare: 250000n,
    },
    {
      baseReserve: 0n,
      quoteReserve: 1500000n, // 1.5 USDC
      totalSupply: 7500000n,
      binId: ACTIVE_ID + 1,
      binPosition: 1,
      liquidityShare: 375000n,
    },
    {
      baseReserve: 500000n, // 0.5 USDC
      quoteReserve: 750000n, // 0.75 USDC
      totalSupply: 2500000n,
      binId: ACTIVE_ID + 2,
      binPosition: 2,
      liquidityShare: 125000n,
    },
  ];

  it('calculates full position removal correctly', () => {
    const removedShares = LiquidityManager.calculateRemovedShares(
      mockPositionReserves,
      RemoveLiquidityType.All,
      ACTIVE_ID,
      ACTIVE_ID + 2
    );

    expect(removedShares).toHaveLength(3);
    expect(removedShares[0].toString()).toBe('250000');
    expect(removedShares[1].toString()).toBe('375000');
    expect(removedShares[2].toString()).toBe('125000');
  });

  it('identifies base token only positions', () => {
    const removedShares = LiquidityManager.calculateRemovedShares(
      mockPositionReserves,
      RemoveLiquidityType.BaseToken,
      ACTIVE_ID,
      ACTIVE_ID + 2
    );

    // Only first position has reserveX > 0 && reserveY === 0
    expect(removedShares[0].toString()).toBe('250000');
    expect(removedShares[1].toString()).toBe('0');
    expect(removedShares[2].toString()).toBe('0');
  });

  it('identifies quote token only positions', () => {
    const removedShares = LiquidityManager.calculateRemovedShares(
      mockPositionReserves,
      RemoveLiquidityType.QuoteToken,
      ACTIVE_ID,
      ACTIVE_ID + 2
    );

    // Only second position has reserveY > 0 && reserveX === 0
    expect(removedShares[0].toString()).toBe('0');
    expect(removedShares[1].toString()).toBe('375000');
    expect(removedShares[2].toString()).toBe('0');
  });

  it('determines when to close position', () => {
    const availableShares = LiquidityManager.getAvailableShares(
      mockPositionReserves,
      RemoveLiquidityType.All
    );

    const shouldClose = LiquidityManager.shouldClosePosition(
      RemoveLiquidityType.All,
      ACTIVE_ID,
      ACTIVE_ID + 2, // covers all 3 bins
      availableShares
    );

    expect(shouldClose).toBe(true);
  });

  it('determines when not to close position', () => {
    const availableShares = LiquidityManager.getAvailableShares(
      mockPositionReserves,
      RemoveLiquidityType.All
    );

    const shouldClose = LiquidityManager.shouldClosePosition(
      RemoveLiquidityType.All,
      ACTIVE_ID,
      ACTIVE_ID,
      availableShares
    );

    expect(shouldClose).toBe(false);
  });
});
