# 🧪 DLMM SDK Tests

## Running Tests

- Run all tests:
  ```bash
  npm test
  ```

- Run a specific test:
  ```bash
  npm test src/tests/integration/swap-with-liquidity.test.ts
  ```

## Setup

The shared setup (`tests/setup/`) does the following:

- Creates a fresh **test wallet** on devnet.
- Airdrops SOL
- Mints **3 test tokens** (`SAROSDEV`, `TESTUSDC`, `TESTWBTC`).
- Creates **pools** using those tokens.
- Saves everything into `/test-data` so tests run consistently across sessions.

## Test Coverage

### Unit Tests

- `bin-manager.test.ts` → Verifies bin indexing, ranges, and PDA derivation.
- `pool-metadata.test.ts` → Fetches pool metadata, validates tokens/decimals, error cases.
- `positions.test.ts` → Ensures fetching user positions + empty wallet case works.
- `get-quote.test.ts` → Validates quoting logic and bigint handling.

### Integration Tests (devnet RPC, real tokens & pools)

- `pool-integration.test.ts` → Creates pools, fetches liquidity, validates pool state.
- `positions-shape.test.ts` → Adds/removes liquidity in different shapes (Spot, Curve, BidAsk).
- `swap-with-liquidity.test.ts` → End-to-end: add liquidity → perform swap → verify balances → cleanup.

## Notes

- Integration tests require **Devnet SOL** in the seeded wallet.
- Liquidity and positions are cleaned up after each test, but if devnet fails, manual cleanup may be required.
