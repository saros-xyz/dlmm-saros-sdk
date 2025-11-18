# Saros DLMM SDK

The engine that powers the Internet Capital Market on Solana.

## Installation

```bash
pnpm add @saros-finance/dlmm-sdk
```

```bash
yarn add @saros-finance/dlmm-sdk
```

```bash
npm install @saros-finance/dlmm-sdk
```

### Core Components

- **`SarosDLMM`** - Static factory class for protocol-level operations (creating pairs, discovering pools)
- **`SarosDLMMPair`** - Pair instance class with operations for a specific pair/pool

## Quick Start

### Initialize the SDK

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { SarosDLMM, MODE } from '@saros-finance/dlmm-sdk';

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const wallet = "WALLET_KEYPAIR"

const sdk = new SarosDLMM({
  mode: MODE.MAINNET,
  connection
});
```

## Creating a New Pool

```typescript
import { PublicKey } from '@solana/web3.js';

const { transaction, pair, activeBin } = await sdk.createPair({
  tokenX: {
    mintAddress: new PublicKey('TokenX_MINT_ADDRESS'),
    decimals: 9,
  },
  tokenY: {
    mintAddress: new PublicKey('TokenY_MINT_ADDRESS'),
    decimals: 6,
  },
  binStep: 1,              // Price step between bins (1 = 0.01% steps)
  ratePrice: 0.000002,     // Initial price of tokenX in terms of tokenY
  payer: wallet.publicKey,
});

// Sign and send the transaction
const signature = await connection.sendTransaction(transaction, [wallet]);
await connection.confirmTransaction(signature);

console.log(`Pool created: ${pair.toString()}`);
console.log(`Active bin: ${activeBin}`);
```

## Getting Pool Metadata

```typescript
const pairAddress = new PublicKey('PAIR_ADDRESS');
const pair = await sdk.getPair(pairAddress);

const metadata = pair.getPairMetadata();
console.log({
  pair: metadata.pair.toString(),
  tokenX: metadata.tokenX.mintAddress.toString(),
  tokenY: metadata.tokenY.mintAddress.toString(),
  binStep: metadata.binStep,
  baseFee: metadata.baseFee,      // Base fee percentage
  dynamicFee: metadata.dynamicFee, // Current fee based on volatility
  protocolFee: metadata.protocolFee, // Protocol fee
});
```

## Providing Liquidity

### 1. Create a Position

```typescript
import { Keypair } from '@solana/web3.js';

// Generate a unique position mint
const positionKeypair = Keypair.generate();

// Create position spanning bins from -5 to +5 around the active bin
const createTx = await pair.createPosition({
  binRange: [-5, 5],
  payer: wallet.publicKey,
  positionMint: positionKeypair.publicKey,
});

const sig = await connection.sendTransaction(createTx, [wallet, positionKeypair]);
await connection.confirmTransaction(sig);
```

### 2. Add Liquidity to Position

```typescript
import { LiquidityShape } from '@saros-finance/dlmm-sdk';

const addTx = await pair.addLiquidityByShape({
  positionMint: positionKeypair.publicKey,
  payer: wallet.publicKey,
  amountTokenX: 1_000_000_000n,  // Amount in token's smallest unit
  amountTokenY: 1_000_000n,
  liquidityShape: LiquidityShape.Spot, // Uniform distribution
  binRange: [-5, 5],
});

const sig = await connection.sendTransaction(addTx, [wallet]);
await connection.confirmTransaction(sig);
```

**Liquidity Shapes:**
- `LiquidityShape.Spot` - Uniform distribution across the range
- `LiquidityShape.Curve` - Bell curve, concentrated at active bin
- `LiquidityShape.BidAsk` - Concentrated at range edges

## Fetching Positions & Reserves

### Get User Positions with Reserves

```typescript
// Get all user positions for this pair
const positions = await pair.getUserPositions({
  payer: wallet.publicKey,
});

// Get reserves for each position
for (const position of positions) {
  console.log(`Position: ${position.positionMint.toString()}`);
  console.log(`Bin range: ${position.lowerBinId} to ${position.upperBinId}`);

  const reserves = await pair.getPositionReserves(position.position);

  reserves.forEach((bin) => {
    if (bin.reserveX > 0n || bin.reserveY > 0n) {
      console.log({
        binId: bin.binId,
        reserveX: bin.reserveX,
        reserveY: bin.reserveY,
        liquidityShare: bin.liquidityShare,
      });
    }
  });
}
```

Alternatively, if you have a position mint and need to derive the position PDA:

```typescript
import { derivePositionPDA, DLMM_PROGRAM_IDS, MODE } from '@saros-finance/dlmm-sdk';

const programId = DLMM_PROGRAM_IDS[MODE.MAINNET].lb;
const position = derivePositionPDA(positionKeypair.publicKey, programId);
const reserves = await pair.getPositionReserves(position);
```

## Removing Liquidity

```typescript
import { RemoveLiquidityType } from '@saros-finance/dlmm-sdk';

const { setupTransaction, transactions, cleanupTransaction, closedPositions } =
  await pair.removeLiquidity({
    positionMints: [positionKeypair.publicKey],
    payer: wallet.publicKey,
    type: RemoveLiquidityType.All, // All, TokenX, or TokenY
  });

// Execute transactions in order
if (setupTransaction) {
  await connection.sendTransaction(setupTransaction, [wallet]);
}

for (const tx of transactions) {
  await connection.sendTransaction(tx, [wallet]);
}

if (cleanupTransaction) {
  await connection.sendTransaction(cleanupTransaction, [wallet]);
}

console.log(`Closed positions: ${closedPositions.length}`);
```

## Swapping Tokens

### Get a Quote

```typescript
const quote = await pair.getQuote({
  amount: 1_000_000n,
  options: {
    swapForY: true,      // true = X→Y, false = Y→X
    isExactInput: true,  // true = exact input, false = exact output
  },
  slippage: 1,           // 1% slippage tolerance
});

console.log({
  amountIn: quote.amountIn,
  amountOut: quote.amountOut,
  minTokenOut: quote.minTokenOut,  // Use this for slippage protection
  priceImpact: quote.priceImpact,
});
```

### Execute Swap

```typescript
const swapTx = await pair.swap({
  tokenIn: pair.getPairMetadata().tokenX.mintAddress,
  tokenOut: pair.getPairMetadata().tokenY.mintAddress,
  amount: 1_000_000n,
  options: {
    swapForY: true,
    isExactInput: true,
  },
  minTokenOut: quote.minTokenOut,  // Slippage protection from quote
  payer: wallet.publicKey,
});

const sig = await connection.sendTransaction(swapTx, [wallet]);
await connection.confirmTransaction(sig);
```

**Swap Modes:**
- **Exact Input**: Spend exactly `amount` of tokenIn, receive variable tokenOut
- **Exact Output**: Receive exactly `amount` of tokenOut, spend variable tokenIn

## Pool Discovery

```typescript
// Get all pool addresses
const allPools = await sdk.getAllPairAddresses();

// Find pools for a specific token
const usdcPools = await sdk.findPairs(
  new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') // USDC
);

// Find pools for a specific token pair
const solUsdcPools = await sdk.findPairs(
  new PublicKey('So11111111111111111111111111111111111111112'), // SOL
  new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')  // USDC
);

// Fetch multiple pairs at once
const pairs = await sdk.getPairs([
  new PublicKey('PAIR_1'),
  new PublicKey('PAIR_2'),
]);
```

## Claiming Rewards

If a pool has rewards enabled, you can claim accumulated rewards from your positions:

```typescript
// Check if the pool has rewards
const hookInfo = await pair.getHookAccount();
if (!hookInfo || !hookInfo.rewardTokenMint) {
  throw new Error('This pool has no reward token');
}

// Claim rewards for a position
const claimTx = await pair.claimReward({
  payer: wallet.publicKey,
  positionMint: positionKeypair.publicKey,
  rewardTokenMint: hookInfo.rewardTokenMint,
});

const sig = await connection.sendTransaction(claimTx, [wallet]);
await connection.confirmTransaction(sig);
```

## Additional Resources

[💬 Join the Saros Dev Station (Telegram)](https://t.me/+mWrfsbbd3Q42YzYx)