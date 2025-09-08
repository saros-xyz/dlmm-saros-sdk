# Basic Swap Example

Complete working example for performing a basic token swap on Saros DLMM.

## Overview

This example demonstrates the most common use case: swapping one token for another through a DLMM pool.

## Prerequisites

- Node.js 16+
- npm or yarn
- A Solana wallet with SOL and tokens

## Setup

```typescript
import {
  LiquidityBookServices,
  PublicKey,
  Keypair
} from "@saros-finance/dlmm-sdk";

// Initialize SDK
const lbServices = new LiquidityBookServices({
  cluster: "mainnet-beta"
});

// Your wallet (replace with actual wallet)
const wallet = Keypair.generate(); // Use your actual wallet
```

## Example 1: Simple Swap

```typescript
async function simpleSwap() {
  try {
    // Pool addresses (C98-USDC pool)
    const C98_USDC_POOL = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");
    const C98_MINT = new PublicKey("C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9");
    const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

    // Swap 1 C98 for USDC
    const result = await lbServices.swap({
      pair: C98_USDC_POOL,
      amount: 1000000, // 1 C98 (6 decimals)
      slippage: 0.5,   // 0.5% max slippage
      payer: wallet.publicKey
    });

    console.log("✅ Swap successful!");
    console.log("Transaction:", result.signature);
    console.log("Explorer:", `https://solscan.io/tx/${result.signature}`);

  } catch (error) {
    console.error("❌ Swap failed:", error.message);
  }
}
```

## Example 2: Swap with Quote First

```typescript
async function swapWithQuote() {
  try {
    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    // Step 1: Get quote first (recommended)
    console.log("🔍 Getting quote...");
    const quote = await lbServices.getQuote({
      amount: BigInt(1000000), // 1 C98
      isExactInput: true,
      swapForY: true, // C98 -> USDC
      pair: poolAddress,
      tokenBase: new PublicKey("C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9"),
      tokenQuote: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 6,
      slippage: 0.5
    });

    console.log("📊 Quote received:");
    console.log(`Expected output: ${quote.amountOut} USDC`);
    console.log(`Price impact: ${quote.priceImpact}%`);
    console.log(`Fee: ${quote.fee} lamports`);

    // Step 2: Execute swap
    console.log("🔄 Executing swap...");
    const result = await lbServices.swap({
      pair: poolAddress,
      amount: 1000000,
      slippage: 0.5,
      payer: wallet.publicKey
    });

    console.log("✅ Swap completed!");
    console.log("Transaction:", result.signature);

  } catch (error) {
    console.error("❌ Swap failed:", error.message);
  }
}
```

## Example 3: Reverse Swap (USDC to C98)

```typescript
async function reverseSwap() {
  try {
    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    // Swap 10 USDC for C98
    const result = await lbServices.swap({
      pair: poolAddress,
      amount: 10000000, // 10 USDC (6 decimals)
      slippage: 0.5,
      payer: wallet.publicKey
    });

    console.log("✅ Reverse swap successful!");
    console.log("Transaction:", result.signature);

  } catch (error) {
    console.error("❌ Reverse swap failed:", error.message);
  }
}
```

## Example 4: Swap with Custom Slippage

```typescript
async function customSlippageSwap() {
  try {
    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    // Very tight slippage (0.1%) - for stable conditions
    const tightSwap = await lbServices.swap({
      pair: poolAddress,
      amount: 1000000,
      slippage: 0.1, // Very strict
      payer: wallet.publicKey
    });

    console.log("✅ Tight slippage swap:", tightSwap.signature);

    // Loose slippage (2.0%) - for volatile conditions
    const looseSwap = await lbServices.swap({
      pair: poolAddress,
      amount: 1000000,
      slippage: 2.0, // More tolerant
      payer: wallet.publicKey
    });

    console.log("✅ Loose slippage swap:", looseSwap.signature);

  } catch (error) {
    console.error("❌ Custom slippage swap failed:", error.message);
  }
}
```

## Example 5: Batch Swaps

```typescript
async function batchSwaps() {
  try {
    const pool1 = new PublicKey("POOL_1_ADDRESS");
    const pool2 = new PublicKey("POOL_2_ADDRESS");

    // Execute multiple swaps
    const results = await Promise.all([
      lbServices.swap({
        pair: pool1,
        amount: 1000000,
        slippage: 0.5,
        payer: wallet.publicKey
      }),
      lbServices.swap({
        pair: pool2,
        amount: 2000000,
        slippage: 0.5,
        payer: wallet.publicKey
      })
    ]);

    console.log("✅ Batch swaps completed:");
    results.forEach((result, index) => {
      console.log(`Swap ${index + 1}:`, result.signature);
    });

  } catch (error) {
    console.error("❌ Batch swap failed:", error.message);
  }
}
```

## Error Handling

```typescript
async function safeSwap() {
  try {
    // Check balance first
    const balance = await getTokenBalance(C98_MINT, wallet.publicKey);
    if (balance < 1000000) {
      throw new Error("Insufficient C98 balance");
    }

    // Check SOL balance for fees
    const solBalance = await lbServices.connection.getBalance(wallet.publicKey);
    if (solBalance < 1000000) { // 0.001 SOL minimum
      throw new Error("Insufficient SOL for transaction fees");
    }

    // Execute swap
    const result = await lbServices.swap({
      pair: new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD"),
      amount: 1000000,
      slippage: 0.5,
      payer: wallet.publicKey
    });

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

## Complete Working Script

```typescript
// basic-swap.ts
import {
  LiquidityBookServices,
  PublicKey,
  Keypair
} from "@saros-finance/dlmm-sdk";

async function main() {
  // Initialize SDK
  const lbServices = new LiquidityBookServices({
    cluster: "mainnet-beta"
  });

  // Use your wallet (replace with actual keypair)
  const wallet = Keypair.generate();

  try {
    console.log("🚀 Starting basic swap example...");

    // Example swap
    const result = await lbServices.swap({
      pair: new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD"),
      amount: 1000000, // 1 C98
      slippage: 0.5,
      payer: wallet.publicKey
    });

    console.log("✅ Swap successful!");
    console.log("Transaction:", result.signature);
    console.log("View on Solscan:", `https://solscan.io/tx/${result.signature}`);

  } catch (error) {
    console.error("❌ Swap failed:", error.message);
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
```

## Running the Example

```bash
# Install dependencies
npm install @saros-finance/dlmm-sdk

# Run the example
npx ts-node basic-swap.ts
```

## Expected Output

```
🚀 Starting basic swap example...
✅ Swap successful!
Transaction: 5xK...3jM
View on Solscan: https://solscan.io/tx/5xK...3jM
```

## Troubleshooting

### Common Issues

1. **"Insufficient funds"**
   - Add SOL for transaction fees
   - Add tokens to swap

2. **"Slippage tolerance exceeded"**
   - Increase slippage percentage
   - Try smaller amounts

3. **"Invalid pair address"**
   - Verify pool address is correct
   - Check if pool exists

4. **"Blockhash not found"**
   - Submit transaction immediately after signing
   - Check network connection

## Next Steps

- Try the [Liquidity Management Example](./liquidity-management.md)
- Learn about [Position Tracking](./position-tracking.md)
- Explore [Pool Analytics](./pool-analytics.md)

---

**Need help?** Check the [troubleshooting guide](../troubleshooting/index.md) or ask in our [Discord community](https://discord.gg/saros)!
