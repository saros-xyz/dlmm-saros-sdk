// vitest-setup.ts
import { beforeAll } from 'vitest';
import { setupTestEnvironment, TestEnvironment } from './environment';

declare global {
  // Make env available across all test files
  var testEnv: TestEnvironment;
}

// Boot once for all tests
beforeAll(async () => {
  console.log('🔧 Setting up test environment...');
  global.testEnv = await setupTestEnvironment();
  console.log(
    `✅ Ready: ${global.testEnv.wallet.address} | ${global.testEnv.token.symbol} | balance: ${global.testEnv.wallet.balance.toFixed(2)} SOL`
  );
});
