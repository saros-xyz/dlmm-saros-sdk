import { describe, expect, it, beforeAll } from 'vitest';
import { getTestWallet, getTestToken, getTestPool } from './test-helpers';
import { ensureTestEnvironment } from './test-setup';

describe('Test Setup Verification', () => {
  beforeAll(async () => {
    await ensureTestEnvironment();
  });

  it('should have test wallet with SOL balance', () => {
    const wallet = getTestWallet();
    expect(wallet).toBeDefined();
    expect(wallet.balance).toBeGreaterThan(0);
    console.log(`Wallet: ${wallet.address}`);
    console.log(`Balance: ${wallet.balance.toFixed(2)} SOL`);
  });

  it('should have SAROSDEV token', () => {
    const saros = getTestToken('SAROSDEV');
    expect(saros).toBeDefined();
    expect(saros.symbol).toBe('SAROSDEV');
    expect(saros.decimals).toBe(9);
    console.log(`SAROSDEV: ${saros.mintAddress.toString()}`);
  });

  it('should have SAROSDEV/wSOL pool', () => {
    const pool = getTestPool();
    expect(pool).toBeDefined();
    expect(pool.binStep).toBe(25);
    expect(pool.ratePrice).toBe(0.00001);
    console.log(`Pool: ${pool.pair}`);
    console.log(`Active Bin: ${pool.activeBin}`);
  });
});