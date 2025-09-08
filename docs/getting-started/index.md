# Getting Started with Saros DLMM SDK

Welcome to the Saros DLMM SDK! This guide will help you get up and running with the most powerful liquidity management system on Solana.

## Prerequisites

Before you begin, ensure you have:

- **Node.js**: Version 16.0 or higher
- **npm** or **yarn**: Latest stable version
- **TypeScript**: Version 4.5 or higher (recommended)
- **Solana CLI**: For development and testing
- **A Solana wallet**: With some SOL for transactions

## Installation

### Using npm
```bash
npm install @saros-finance/dlmm-sdk
```

### Using yarn
```bash
yarn add @saros-finance/dlmm-sdk
```

### Using pnpm
```bash
pnpm add @saros-finance/dlmm-sdk
```

## Basic Setup

### 1. Import the SDK

```typescript
import {
  LiquidityBookServices,
  MODE,
  BIN_STEP_CONFIGS
} from "@saros-finance/dlmm-sdk";
import { PublicKey } from "@solana/web3.js";
```

### 2. Initialize the Service

```typescript
// For production (mainnet)
const lbServices = new LiquidityBookServices({
  mode: MODE.MAINNET
});

// For development (devnet)
const lbServicesDev = new LiquidityBookServices({
  mode: MODE.DEVNET
});
```

### 3. Verify Connection

```typescript
// Check if connected to the correct network
console.log("Connected to:", lbServices.connection.rpcEndpoint);
console.log("DEX Name:", lbServices.getDexName());
console.log("Program ID:", lbServices.getDexProgramId());
```

## Your First Swap

Let's create a simple token swap application.

### Complete Example

```typescript
import {
  LiquidityBookServices,
  MODE
} from "@saros-finance/dlmm-sdk";
import { PublicKey, Keypair } from "@solana/web3.js";

async function performSwap() {
  // Initialize SDK
  const lbServices = new LiquidityBookServices({
    mode: MODE.MAINNET
  });

  // Example: Swap C98 to USDC
  const C98_MINT = new PublicKey("C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9");
  const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const POOL_ADDRESS = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

  // Your wallet (replace with actual keypair)
  const userWallet = Keypair.generate();

  try {
    // Step 1: Get a quote
    console.log("Getting swap quote...");
    const quote = await lbServices.getQuote({
      amount: BigInt(1000000), // 1 C98 (6 decimals)
      isExactInput: true,
      swapForY: true, // C98 -> USDC
      pair: POOL_ADDRESS,
      tokenBase: C98_MINT,
      tokenQuote: USDC_MINT,
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 6,
      slippage: 0.5 // 0.5% slippage tolerance
    });

    console.log(`Expected output: ${quote.amountOut} USDC`);
    console.log(`Price impact: ${quote.priceImpact}%`);

    // Step 2: Create swap transaction
    console.log("Creating swap transaction...");
    const swapTx = await lbServices.swap({
      amount: quote.amount,
      tokenMintX: C98_MINT,
      tokenMintY: USDC_MINT,
      otherAmountOffset: quote.otherAmountOffset,
      hook: lbServices.hooksConfig,
      isExactInput: true,
      swapForY: true,
      pair: POOL_ADDRESS,
      payer: userWallet.publicKey
    });

    // Step 3: Sign and send (in production, use wallet adapter)
    const { blockhash, lastValidBlockHeight } =
      await lbServices.connection.getLatestBlockhash();

    swapTx.recentBlockhash = blockhash;
    swapTx.feePayer = userWallet.publicKey;
    swapTx.sign(userWallet);

    console.log("Transaction created successfully!");
    console.log("Transaction signature would be:", swapTx.signature);

    // In production:
    // const signature = await lbServices.connection.sendRawTransaction(
    //   swapTx.serialize()
    // );

  } catch (error) {
    console.error("Swap failed:", error);
  }
}

// Run the example
performSwap();
```

## Environment Configuration

### Development (Devnet)

```typescript
const lbServices = new LiquidityBookServices({
  mode: MODE.DEVNET
});

// Devnet token addresses
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const SAROS_MINT = new PublicKey("mntCAkd76nKSVTYxwu8qwQnhPcEE9JyEbgW6eEpwr1N");
const DEVNET_POOL = new PublicKey("C8xWcMpzqetpxwLj7tJfSQ6Juh1wHFdT5KrkwdYPQB");
```

### Production (Mainnet)

```typescript
const lbServices = new LiquidityBookServices({
  mode: MODE.MAINNET
});

// Mainnet token addresses
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const C98_MINT = new PublicKey("C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9");
const MAINNET_POOL = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");
```

## Error Handling

Always wrap your SDK calls in try-catch blocks:

```typescript
try {
  const result = await lbServices.someMethod(params);
  console.log("Success:", result);
} catch (error) {
  console.error("Error:", error.message);

  // Handle specific error types
  if (error.message.includes("Slippage")) {
    console.log("Price slippage exceeded tolerance");
  } else if (error.message.includes("Insufficient")) {
    console.log("Insufficient token balance");
  }
}
```

## Next Steps

Now that you have the basics, explore:

1. **[Core Concepts](../core-concepts/)** - Understand DLMM mechanics
2. **[API Reference](../api-reference/)** - Complete method documentation
3. **[Guides](../guides/)** - Advanced tutorials
4. **[Examples](../examples/)** - More code samples

## Need Help?

- 📚 [Full Documentation](../)
- 💬 [Discord Community](https://discord.gg/saros)
- 🐛 [GitHub Issues](https://github.com/saros-xyz/dlmm-sdk/issues)
- 📧 [Security Issues](../security/security-disclosure.md)

---

**Happy building with Saros DLMM! 🚀**</content>
<parameter name="filePath">h:\Rahul Prasad 01\earn\Saros\docs\getting-started\index.md
