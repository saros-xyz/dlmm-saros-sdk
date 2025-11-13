# 🧪 DLMM SDK Tests

## Running Tests

```bash
# Run all tests
pnpm test

# Run a specific test file
pnpm test src/tests/integration/swap-with-liquidity.test.ts
```

## Setup

The test suite uses a shared environment (`src/tests/setup/`) that:

- Creates a fresh **test wallet** on devnet (or loads existing)
- Airdrops SOL to the wallet
- Mints **1 test token** (`SAROSDEV`)
- Creates **1 pool** (`SAROSDEV/wSOL`) with `binStep=1` and `ratePrice=0.000002`
- Saves everything to `/test-data` for consistent test runs

All tests have access to this environment via `global.testEnv`, which includes:
- `wallet` - Test wallet with funded SOL
- `token` - SAROSDEV token info (mint, symbol, decimals)
- `pool` - Pool info (pair address, tokenX, tokenY, binStep, ratePrice)
- `connection` - Devnet RPC connection
- `sdk` - Pre-configured `SarosDLMM` instance

## Test Coverage

### Setup Verification
- `verify-setup.test.ts` - Validates wallet, token, and pool were created correctly

### Unit Tests
- `pool-metadata.test.ts` - Fetches pool metadata, validates token decimals, fee normalization, and error cases
- `position-utils.test.ts` - Tests position fetching logic and empty wallet cases
- `quote-validation.test.ts` - Validates swap quoting logic and bigint handling

### Integration Tests
- `positions-shape.test.ts` - Tests liquidity distribution shapes (Spot, Curve, BidAsk)
- `swap-with-liquidity.test.ts` - End-to-end swap tests with exact input/output modes

## Notes

- Integration tests require **Devnet SOL** in the seeded wallet
- All tests close and reclaim liquidity after testing but may fail. Follow instructions in `vitest.config.ts` and run `pnpm test:cleanup` to manually reclaim all tokens after testings
