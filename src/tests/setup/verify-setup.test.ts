import { describe, expect, it } from 'vitest';

describe('Test Setup Verification', () => {
  it('should have test wallet with SOL balance', () => {
    const { wallet } = global.testEnv;

    expect(wallet).toBeDefined();
    expect(wallet.balance).toBeGreaterThan(0);

    console.log(`Wallet: ${wallet.address}`);
    console.log(`Balance: ${wallet.balance.toFixed(2)} SOL`);
  });

  it('should have SAROSDEV token', () => {
    const { token } = global.testEnv;

    expect(token).toBeDefined();
    expect(token.symbol).toBe('SAROSDEV');
    expect(token.decimals).toBe(9);

    console.log(`SAROSDEV: ${token.mint.toString()}`);
  });

  it('should have SAROSDEV/wSOL pool', () => {
    const { pool } = global.testEnv;

    expect(pool).toBeDefined();
    expect(pool.binStep).toBe(1);   // we set binStep = 1 in new token.ts
    expect(pool.ratePrice).toBe(1); // we set ratePrice = 1 in new token.ts

    console.log(`Pool: ${pool.pair.toString()}`);
  });
});
