# 💡 Code Examples

**Copy-paste ready** examples for common Saros DLMM use cases.

## 🚀 Basic Swap

```typescript
import { LiquidityBookServices } from "@saros-finance/dlmm-sdk";

const lbServices = new LiquidityBookServices({
  cluster: "mainnet-beta"
});

// Swap 1 C98 to USDC
const result = await lbServices.swap({
  pair: new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD"),
  amount: 1000000, // 1 C98
  slippage: 0.5,
  payer: wallet.publicKey
});
```

## 📊 Get Quote First

```typescript
// Always get quote before swapping
const quote = await lbServices.getQuote({
  amount: BigInt(1000000),
  isExactInput: true,
  swapForY: true,
  pair: poolAddress,
  tokenBase: tokenX,
  tokenQuote: tokenY,
  tokenBaseDecimal: 6,
  tokenQuoteDecimal: 6,
  slippage: 0.5
});

console.log("Expected output:", quote.amountOut);
console.log("Price impact:", quote.priceImpact + "%");
console.log("Fee:", quote.fee / 1000000, "tokens");
```

## 🔄 Batch Swaps

```typescript
// Swap multiple tokens in sequence
const swaps = [
  { pair: pool1, amount: 1000000 },
  { pair: pool2, amount: 500000 },
  { pair: pool3, amount: 2000000 }
];

for (const swap of swaps) {
  const result = await lbServices.swap({
    ...swap,
    slippage: 0.5,
    payer: wallet.publicKey
  });
  console.log("Swap completed:", result.signature);
}
```

## 📈 Price Monitoring

```typescript
// Monitor price changes
async function monitorPrice(poolAddress: PublicKey) {
  const pool = await lbServices.getPairAccount(poolAddress);

  setInterval(async () => {
    const updatedPool = await lbServices.getPairAccount(poolAddress);
    const priceChange = calculatePriceChange(pool, updatedPool);

    if (Math.abs(priceChange) > 1) { // 1% change
      console.log("⚠️ Price changed:", priceChange + "%");
    }
  }, 30000); // Check every 30 seconds
}
```

## 💰 Fee Calculator

```typescript
// Calculate potential fees
function calculateFees(amount: number, feeRate: number) {
  const fee = (amount * feeRate) / 100;
  const netAmount = amount - fee;

  return {
    original: amount,
    fee: fee,
    net: netAmount,
    rate: feeRate + "%"
  };
}

// Example: 1000 USDC swap at 0.05% fee
const fees = calculateFees(1000, 0.05);
console.log("Fee:", fees.fee, "USDC");
console.log("Net received:", fees.net, "USDC");
```

## 🛡️ Error Handling

```typescript
async function safeSwap(params: SwapParams) {
  try {
    // Check balance first
    const balance = await getTokenBalance(params.tokenMint, params.payer);
    if (balance < params.amount) {
      throw new Error("Insufficient balance");
    }

    // Get fresh quote
    const quote = await lbServices.getQuote(params);

    // Check slippage
    if (quote.priceImpact > params.maxSlippage) {
      throw new Error("Price impact too high");
    }

    // Execute swap
    const result = await lbServices.swap(params);
    return result;

  } catch (error) {
    console.error("Swap failed:", error.message);

    // Handle specific errors
    if (error.message.includes("insufficient")) {
      console.log("💰 Add more tokens to your wallet");
    } else if (error.message.includes("slippage")) {
      console.log("📈 Try lower amount or higher slippage");
    }

    throw error;
  }
}
```

## 🔧 React Hook Example

```typescript
// useSarosSwap.ts
import { useState, useCallback } from "react";
import { LiquidityBookServices } from "@saros-finance/dlmm-sdk";

export function useSarosSwap() {
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);

  const getQuote = useCallback(async (params) => {
    setLoading(true);
    try {
      const result = await lbServices.getQuote(params);
      setQuote(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const executeSwap = useCallback(async (params) => {
    setLoading(true);
    try {
      const result = await lbServices.swap(params);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, quote, getQuote, executeSwap };
}
```

## 📱 Mobile/React Native

```typescript
// React Native example
import { LiquidityBookServices } from "@saros-finance/dlmm-sdk/mobile";

const lbServices = new LiquidityBookServices({
  cluster: "mainnet-beta",
  // Mobile-optimized settings
  commitment: "confirmed",
  timeout: 30000
});

// Same API as web version
const result = await lbServices.swap({
  pair: poolAddress,
  amount: 1000000,
  slippage: 0.5,
  payer: wallet.publicKey
});
```

```typescript
import { LiquidityShape } from "@saros-finance/dlmm-sdk";
import { createUniformDistribution } from "@saros-finance/dlmm-sdk/utils";

const liquidityDistribution = createUniformDistribution({
  shape: LiquidityShape.Spot,
  binRange: [-10, 10]
});

const addLiquidityTx = await lbServices.addLiquidityIntoPosition({
  pair: poolAddress,
  position: positionAddress,
  binRange: [-10, 10],
  baseAmount: BigInt(1000000),
  quoteAmount: BigInt(1000000),
  distribution: liquidityDistribution,
  payer: userWallet.publicKey
});
```

### Monitor Positions

```typescript
const positions = await lbServices.getUserPositions({
  payer: userWallet.publicKey,
  pair: poolAddress
});

positions.forEach(pos => {
  console.log(`Position: ${pos.position}`);
  console.log(`Lower bin: ${pos.lowerBinId}`);
  console.log(`Upper bin: ${pos.upperBinId}`);
});
```

## Example Categories

### 🔄 **Swapping Examples**
- [Basic Token Swap](./basic-swap.md) - Simple swap implementation with step-by-step guide
- [Batch Operations](./batch-operations.md) - Multiple operations in single transactions
- [Error Handling](./error-handling.md) - Robust error management and recovery

### 💧 **Liquidity Examples**
- [Liquidity Management](./liquidity-management.md) - Add, remove, and manage liquidity positions
- [Position Tracking](./position-tracking.md) - Monitor and analyze your positions

### 📊 **Analytics Examples**
- [Pool Analytics](./pool-analytics.md) - Analyze pool performance, volume, and health metrics

### 🔧 **Advanced Examples**
- Batch operations with retry logic
- Cross-pool transactions
- Position management automation
- Real-time monitoring and alerts

## Running Examples

### Prerequisites

```bash
# Install dependencies
npm install @saros-finance/dlmm-sdk

# For devnet testing
npm install @solana/web3.js @solana/spl-token
```

### Environment Setup

```typescript
// .env file
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_PRIVATE_KEY=your_private_key_here
```

```typescript
// config.ts
import { config } from "dotenv";
config();

export const CONFIG = {
  rpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  walletKey: process.env.WALLET_PRIVATE_KEY
};
```

### Common Setup

```typescript
// setup.ts
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";
import { Keypair, PublicKey } from "@solana/web3.js";
import { CONFIG } from "./config";

// Initialize SDK
export const lbServices = new LiquidityBookServices({
  mode: MODE.MAINNET
});

// Wallet setup (replace with wallet adapter in production)
export const userWallet = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(CONFIG.walletKey))
);

// Common token addresses
export const TOKENS = {
  USDC: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  C98: new PublicKey("C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9"),
  WSOL: new PublicKey("So11111111111111111111111111111111111111112")
};

// Common pool addresses
export const POOLS = {
  C98_USDC: new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD"),
  WSOL_USDC: new PublicKey("27Y8nGm9HrWr9cN6CXQRmhHQD9sW2JvZ8AqZ6Q1w9J9")
};
```

## Example Structure

Each example follows this pattern:

```typescript
// 1. Imports
import { ... } from "@saros-finance/dlmm-sdk";

// 2. Configuration
const config = { ... };

// 3. Main function
async function example() {
  try {
    // Setup
    const lbServices = new LiquidityBookServices({ mode: MODE.MAINNET });

    // Implementation
    const result = await lbServices.someMethod(params);

    // Success handling
    console.log("✅ Success:", result);

  } catch (error) {
    // Error handling
    console.error("❌ Error:", error);
  }
}

// 4. Execution
example();
```

## Testing Examples

### Unit Tests

```typescript
// __tests__/swap.test.ts
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";

describe("Swap Examples", () => {
  let lbServices: LiquidityBookServices;

  beforeAll(() => {
    lbServices = new LiquidityBookServices({ mode: MODE.DEVNET });
  });

  test("should get valid quote", async () => {
    const quote = await lbServices.getQuote({
      amount: BigInt(1000000),
      isExactInput: true,
      swapForY: true,
      pair: new PublicKey("POOL_ADDRESS"),
      // ... other params
    });

    expect(quote.amountOut).toBeGreaterThan(0);
    expect(quote.priceImpact).toBeLessThan(1);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration.test.ts
describe("Integration Tests", () => {
  test("should complete full swap workflow", async () => {
    // Setup test wallet with tokens
    const testWallet = Keypair.generate();

    // Fund wallet (in test environment)
    // ... funding logic

    // Execute swap
    const result = await performSwap(testWallet);

    // Verify results
    expect(result.success).toBe(true);
    expect(result.outputAmount).toBeGreaterThan(0);
  });
});
```

## Best Practices

### Code Organization

```typescript
// types/
export interface SwapConfig {
  inputMint: PublicKey;
  outputMint: PublicKey;
  amount: bigint;
  slippage: number;
}

// utils/
export async function validateBalance(
  mint: PublicKey,
  owner: PublicKey,
  required: bigint
): Promise<boolean> {
  const balance = await getTokenBalance(mint, owner);
  return balance >= required;
}

// services/
export class SwapService {
  constructor(private lbServices: LiquidityBookServices) {}

  async executeSwap(config: SwapConfig) {
    // Implementation
  }
}
```

### Error Handling

```typescript
export class DLMMError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = "DLMMError";
  }
}

export function handleDLMMError(error: Error): never {
  if (error.message.includes("Slippage")) {
    throw new DLMMError(
      "Slippage tolerance exceeded",
      "SLIPPAGE_EXCEEDED",
      { suggestedSlippage: 1.0 }
    );
  }

  if (error.message.includes("Insufficient")) {
    throw new DLMMError(
      "Insufficient token balance",
      "INSUFFICIENT_BALANCE",
      { required: "X tokens" }
    );
  }

  throw new DLMMError(
    "Unknown error occurred",
    "UNKNOWN_ERROR",
    error
  );
}
```

### Logging

```typescript
export class Logger {
  static info(message: string, data?: any) {
    console.log(`ℹ️ ${message}`, data);
  }

  static success(message: string, data?: any) {
    console.log(`✅ ${message}`, data);
  }

  static error(message: string, error?: any) {
    console.error(`❌ ${message}`, error);
  }

  static warn(message: string, data?: any) {
    console.warn(`⚠️ ${message}`, data);
  }
}

// Usage
Logger.info("Getting quote", { amount: 1000000 });
Logger.success("Quote received", quote);
```

## Contributing Examples

### Adding New Examples

1. **Create example file** in appropriate directory
2. **Follow naming convention**: `kebab-case.md`
3. **Include all imports** and setup code
4. **Add error handling** and best practices
5. **Test the example** before submitting
6. **Update this index** file

### Example Template

```markdown
# Example Title

Brief description of what this example demonstrates.

## Overview

Detailed explanation of the example.

## Code

```typescript
// Complete working example
```

## Running the Example

```bash
# Commands to run the example
```

## Expected Output

```
Expected console output
```

## Next Steps

Links to related examples or documentation.
```

## Support

- 📚 **[API Reference](../api-reference/index.md)** - Complete method documentation
- 🐛 **[GitHub Issues](https://github.com/saros-xyz/dlmm-sdk/issues)** - Report bugs
- 💬 **[Discord](https://discord.gg/saros)** - Community support
- 📧 **[Security](../security/security-disclosure.md)** - Security issues

---

**Ready to explore? Start with our [Basic Token Swap](./basic-swap.md) example!**</content>
<parameter name="filePath">h:\Rahul Prasad 01\earn\Saros\docs\examples\index.md
