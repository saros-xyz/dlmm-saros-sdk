# Saros DLMM SDK

The engine that powers the Internet Capital Market on Solana.

## Installation

Use your environment's package manager to install @saros-finance/dlmm-sdk into your project.

```bash
yarn add @saros-finance/dlmm-sdk
```

```bash
npm install @saros-finance/dlmm-sdk
```

## Overview

The Saros DLMM SDK provides a modern, pool-centric API for interacting with Dynamic Liquidity Market Maker pools on Solana. The SDK follows a factory pattern where you create pool instances that maintain context and provide optimized access to pool-specific operations.

## Architecture

### Core Components

- **`SarosDLMM`** - Static factory class for protocol-level operations (creating pairs, discovering pools)
- **`SarosDLMMPair`** - Pair instance class with operations for a specific pair/pool

### Key Benefits

- **Performance**: Pool data is cached at initialization, eliminating redundant RPC calls
- **Developer Experience**: Clean, intuitive API with proper TypeScript support
- **Resource Efficient**: Batch operations and optimized data fetching

## Quick Start

### Basic Setup

```typescript
import { SarosDLMM } from '@saros-finance/dlmm-sdk';
import { PublicKey } from '@solana/web3.js';
import { MODE } from '@saros-finance/dlmm-sdk';

// Configure the SDK
const config = {
  mode: MODE.MAINNET, // or MODE.DEVNET
  options: {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  },
};

// Get a pair instance (loads and caches pair data)
const pairAddress = new PublicKey('9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk');
const pair = await SarosDLMM.create(config, pairAddress);
```

### Getting Pool Information

```typescript
// Get pair metadata
const metadata = pair.getPairMetadata();
console.log(`Pool: ${metadata.baseToken.symbol}/${metadata.quoteToken.symbol}`);

// Get current liquidity distribution
const liquidity = await pair.getPairLiquidity({ numberOfBinArrays: 3 });
console.log(`Active bin: ${liquidity.activeBin}, Total bins: ${liquidity.bins.length}`);
```

### Swapping Tokens

```typescript
import { PublicKey } from '@solana/web3.js';

// Get a quote first
const quote = await pair.getQuote({
  amount: 1000000n, // 1 token (adjust for decimals)
  options: { swapForY: true, isExactInput: true },
  slippage: 1, // 1% slippage
});

console.log(`Input: ${quote.amountIn}, Output: ${quote.amountOut}`);

// Execute the swap
const swapTx = await pair.swap({
  tokenIn: new PublicKey('TokenMintA...'),
  tokenOut: new PublicKey('TokenMintB...'),
  amount: quote.amountIn,
  options: { swapForY: true, isExactInput: true },
  minTokenOut: quote.minTokenOut,
  payer: walletPublicKey,
  // hook: customHookAddress, // Optional: custom hook for rewards
});

// Sign and send the transaction
const signature = await connection.sendTransaction(swapTx, [wallet]);
```

### Adding Liquidity

```typescript
import { LiquidityShape } from '@saros-finance/dlmm-sdk';
import { Keypair } from '@solana/web3.js';

// Create a position NFT
const positionKeypair = Keypair.generate();
const createTx = await pair.createPosition({
  payer: walletPublicKey,
  positionMint: positionKeypair.publicKey,
  binRange: [-5, 5], // 5 bins on each side of active bin
});

// Add liquidity with different distribution shapes
const addLiquidityTx = await pair.addLiquidityByShape({
  positionMint: positionKeypair.publicKey,
  payer: walletPublicKey,
  baseAmount: 1000000000n, // Amount of base token
  quoteAmount: 1000000n,   // Amount of quote token
  liquidityShape: LiquidityShape.Spot, // Spot, Curve, or BidAsk
  binRange: [-5, 5],
});

// Execute transactions
await connection.sendTransaction(createTx, [wallet, positionKeypair]);
await connection.sendTransaction(addLiquidityTx, [wallet]);
```

### Managing Existing Positions

```typescript
import { RemoveLiquidityType } from '@saros-finance/dlmm-sdk';

// Get user's positions for this pool
const positions = await pair.getUserPositions({ payer: walletPublicKey });
console.log(`Found ${positions.length} positions`);

// Remove liquidity from specific positions
const removeLiquidityResult = await pair.removeLiquidity({
  positionMints: [positions[0].positionMint], // Use existing position
  payer: walletPublicKey,
  type: RemoveLiquidityType.All, // All, BaseToken, or QuoteToken
});

// Execute remove liquidity transactions (may include setup/cleanup)
if (removeLiquidityResult.setupTransaction) {
  await connection.sendTransaction(removeLiquidityResult.setupTransaction, [wallet]);
}
for (const tx of removeLiquidityResult.transactions) {
  await connection.sendTransaction(tx, [wallet]);
}
if (removeLiquidityResult.cleanupTransaction) {
  await connection.sendTransaction(removeLiquidityResult.cleanupTransaction, [wallet]);
}
```

### Protocol-Level Operations

```typescript
// Discover all pairs in the protocol
const allPairAddresses = await SarosDLMM.getAllPairAddresses(config);
console.log(`Found ${allPairAddresses.length} pairs`);

// Find pairs for specific tokens
const tokenA = new PublicKey('TokenMintA...');
const tokenB = new PublicKey('TokenMintB...');
const matchingPairs = await SarosDLMM.findPoolsByTokens(config, tokenA, tokenB);

// Create a new pair on-chain
const createPairResult = await SarosDLMM.createNewPair(config, {
  baseToken: { mintAddress: tokenA.toString(), decimals: 9 },
  quoteToken: { mintAddress: tokenB.toString(), decimals: 6 },
  binStep: 25, // 0.25% fee tier
  ratePrice: 1.5, // Initial price
  payer: walletPublicKey,
});

// Work with multiple pairs efficiently
const pairs = await SarosDLMM.createMultiple(config, [
  new PublicKey('PairA...'),
  new PublicKey('PairB...'),
  new PublicKey('PairC...'),
]);

// Each pair instance has cached data and individual methods
for (const pair of pairs) {
  const metadata = pair.getPairMetadata();
  console.log(`${metadata.baseToken.symbol}/${metadata.quoteToken.symbol}`);
}
```

## Error Handling

The SDK provides specific error types for different scenarios:

```typescript
import { PairServiceError, SwapServiceError, PositionServiceError } from '@saros-finance/dlmm-sdk';

try {
  const quote = await pair.getQuote({
    amount: 0n, // Invalid amount
    options: { swapForY: true, isExactInput: true },
    slippage: 1,
  });
} catch (error) {
  if (error === SwapServiceError.ZeroAmount) {
    console.error('Amount cannot be zero');
  } else if (error === SwapServiceError.InvalidSlippage) {
    console.error('Slippage must be between 0 and 100');
  }
}
```

## Migration from Previous Versions

If you're upgrading from a previous version that used the old service-based API:

### Old Pattern (Deprecated)
```typescript
// ❌ Old way - required pair parameter in every call
const lbServices = new SarosDLMM(config);
const quote = await lbServices.getQuote({
  pair: pairAddress,
  amount: 1000000n,
  options: { swapForY: true, isExactInput: true },
  slippage: 1,
});
```

### New Pattern (Recommended)
```typescript
// ✅ New way - pair context is managed by the instance
const pair = await SarosDLMM.create(config, pairAddress);
const quote = await pair.getQuote({
  amount: 1000000n,
  options: { swapForY: true, isExactInput: true },
  slippage: 1,
});
```

## Type Definitions

The SDK exports clean, properly typed interfaces:

```typescript
import type {
  // Instance method parameters (clean, no pair parameter)
  PairQuoteParams,
  PairSwapParams,
  PairCreatePositionParams,

  // Response types
  QuoteResponse,
  PairMetadata,
  RemoveLiquidityResponse,

  // Configuration
  SarosConfig,
  MODE,

  // Enums
  LiquidityShape,
  RemoveLiquidityType,
} from '@saros-finance/dlmm-sdk';
```