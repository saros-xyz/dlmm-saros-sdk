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

The Saros DLMM SDK provides a modern, pool-centric API for interacting with Dynamic Liquidity Market Maker pools on Solana.

## Architecture

### Core Components

- **`SarosDLMM`** - Static factory class for protocol-level operations (creating pairs, discovering pools)
- **`SarosDLMMPair`** - Pair instance class with operations for a specific pair/pool

## Quick Start

### Basic Setup

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { SarosDLMM, MODE } from '@saros-finance/dlmm-sdk';

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const sdk = new SarosDLMM({ mode: MODE.MAINNET, connection });

// Get a pair instance
const pairAddress = new PublicKey('9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk');
const pair = await sdk.getPair(pairAddress);
```

### Getting Pool Information

```typescript
// Metadata
const metadata = pair.getPairMetadata();
console.log(`${metadata.baseToken.symbol}/${metadata.quoteToken.symbol}`);

// Liquidity distribution
const liquidity = await pair.getPairLiquidity({ numberOfBinArrays: 3 });
console.log(`Active bin: ${liquidity.activeBin}, bins: ${liquidity.bins.length}`);
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
});

// Sign and send the transaction
const signature = await connection.sendTransaction(swapTx, [wallet]);
```

### Adding Liquidity

```typescript
import { Keypair } from '@solana/web3.js';
import { LiquidityShape } from '@saros-finance/dlmm-sdk';

const positionKeypair = Keypair.generate();

// Create a position NFT
const createTx = await pair.createPosition({
  payer: walletPublicKey,
  positionMint: positionKeypair.publicKey,
  binRange: [-5, 5],
});

// Add liquidity
const addTx = await pair.addLiquidityByShape({
  positionMint: positionKeypair.publicKey,
  payer: walletPublicKey,
  baseAmount: 1_000_000_000n,
  quoteAmount: 1_000_000n,
  liquidityShape: LiquidityShape.Spot,
  binRange: [-5, 5],
});

// Execute
await connection.sendTransaction(createTx, [wallet, positionKeypair]);
await connection.sendTransaction(addTx, [wallet]);
```

### Managing Existing Positions

```typescript
import { RemoveLiquidityType } from '@saros-finance/dlmm-sdk';

const positions = await pair.getUserPositions({ payer: walletPublicKey });
console.log(`Found ${positions.length} positions`);

const result = await pair.removeLiquidity({
  positionMints: [positions[0].positionMint],
  payer: walletPublicKey,
  type: RemoveLiquidityType.All,
});

// Execute returned txs
if (result.setupTransaction) {
  await connection.sendTransaction(result.setupTransaction, [wallet]);
}
for (const tx of result.transactions) {
  await connection.sendTransaction(tx, [wallet]);
}
if (result.cleanupTransaction) {
  await connection.sendTransaction(result.cleanupTransaction, [wallet]);
}
```

### Protocol-Level Operations

```typescript
// Discover all pairs
const allPairs = await sdk.getAllPairAddresses();
console.log(`Found ${allPairs.length} pairs`);

// Find pools by tokens
const tokenA = new PublicKey('...');
const tokenB = new PublicKey('...');
const matches = await sdk.findPoolsByTokens(tokenA, tokenB);

// Create new pool
const createResult = await sdk.createNewPair({
  baseToken: { mintAddress: tokenA.toBase58(), decimals: 9 },
  quoteToken: { mintAddress: tokenB.toBase58(), decimals: 6 },
  binStep: 25,
  ratePrice: 1.5,
  payer: walletPublicKey,
});

// Work with multiple pools
const pairs = await sdk.getMultiplePairs([
  new PublicKey('PairA...'),
  new PublicKey('PairB...'),
]);
```


## Migration from Previous Versions

If run into any issues upgrading to the latest version please contact Saros support via 
