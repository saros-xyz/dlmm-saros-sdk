import { describe, expect, it } from 'vitest';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { ACTIVE_ID } from '../../constants';
import { Liquidity } from '../../utils/liquidity';
import { SarosDLMM } from '../../services';
import { MODE, PositionReserve, RemoveLiquidityType } from '../../types';

// Single connection + SDK instance for all tests
const connection = new Connection(
  process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);
const sdk = new SarosDLMM({ mode: MODE.MAINNET, connection });

const USDC_USDT = '9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk';
// any wallet with a DLMM position open
const TEST_WALLET = new PublicKey('4VGLP8wqFEHEoh8vjgYCMsUbZ6LtuYrxcJv226qCWNuT');

describe('Position Operations', () => {
  it('fetches user positions for pool', async () => {
    const pair = await sdk.getPair(new PublicKey(USDC_USDT));
    const positions = await pair.getUserPositions({
      payer: TEST_WALLET,
    });

    expect(Array.isArray(positions)).toBe(true);
    expect(positions.length).toBeGreaterThan(0);

    positions.forEach((position) => {
      expect(position.upperBinId).toBeGreaterThanOrEqual(position.lowerBinId);
    });
  });

  it('handles wallet with no positions', async () => {
    const pair = await sdk.getPair(new PublicKey(USDC_USDT));
    const positions = await pair.getUserPositions({
      payer: Keypair.generate().publicKey,
    });

    expect(positions).toEqual([]);
  });
});

describe('Liquidity Logic', () => {
  const mockPositionReserves: PositionReserve[] = [
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
    const removedShares = Liquidity.calculateRemovedShares(
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

  it('identifies token x only positions', () => {
    const removedShares = Liquidity.calculateRemovedShares(
      mockPositionReserves,
      RemoveLiquidityType.TokenX,
      ACTIVE_ID,
      ACTIVE_ID + 2
    );

    expect(removedShares[0].toString()).toBe('250000');
    expect(removedShares[1].toString()).toBe('0');
    expect(removedShares[2].toString()).toBe('0');
  });

  it('identifies token y only positions', () => {
    const removedShares = Liquidity.calculateRemovedShares(
      mockPositionReserves,
      RemoveLiquidityType.TokenY,
      ACTIVE_ID,
      ACTIVE_ID + 2
    );

    expect(removedShares[0].toString()).toBe('0');
    expect(removedShares[1].toString()).toBe('375000');
    expect(removedShares[2].toString()).toBe('0');
  });

  it('determines when to close position', () => {
    const availableShares = Liquidity.getAvailableShares(
      mockPositionReserves,
      RemoveLiquidityType.All
    );

    const shouldClose = Liquidity.shouldClosePosition(
      RemoveLiquidityType.All,
      ACTIVE_ID,
      ACTIVE_ID + 2, // covers all 3 bins
      availableShares
    );

    expect(shouldClose).toBe(true);
  });

  it('determines when not to close position', () => {
    const availableShares = Liquidity.getAvailableShares(
      mockPositionReserves,
      RemoveLiquidityType.All
    );

    const shouldClose = Liquidity.shouldClosePosition(
      RemoveLiquidityType.All,
      ACTIVE_ID,
      ACTIVE_ID,
      availableShares
    );

    expect(shouldClose).toBe(false);
  });
});
