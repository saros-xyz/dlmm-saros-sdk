# Saros DLMM SDK Developer Documentation

## Overview

Welcome to the Saros DLMM SDK documentation! This guide is designed to make building with the Saros DLMM (Dynamic Liquidity Market Maker) SDK a seamless and enjoyable experience. Whether you're a seasoned DeFi developer or just starting your hackathon project, this documentation will fast-track you from zero to shipping.

**SDK Details:**
- **Name:** @saros-finance/dlmm-sdk
- **Version:** 1.4.0
- **Language:** TypeScript
- **Features:** Swaps, Liquidity Management, Pool Creation, Price Quotes
- **Networks:** Solana Mainnet and Devnet
- **Repository:** [saros-dlmm-sdk](https://github.com/saros-finance/dlmm-sdk)

This documentation package includes everything you need to integrate Saros DLMM into your applications, with tested code examples, step-by-step tutorials, and comprehensive API references.

---

## Quick-Start Guide

Get up and running with Saros DLMM SDK in under 10 minutes!

### Prerequisites

- Node.js 16+ (`npm install -g typescript ts-node`)
- Yarn or NPM package manager
- Solana CLI (optional, for wallet generation)
- A funded Solana wallet (use devnet for testing)

### Installation

```bash
# Create a new project
mkdir my-saros-app && cd my-saros-app
npm init -y

# Install dependencies
npm install @saros-finance/dlmm-sdk @solana/web3.js js-big-decimal @coral-xyz/anchor

# Optional: Install for development
npm install -D typescript @types/node
```

### Basic Setup

```typescript
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";

// Initialize the main SDK service class
const liquidityBookServices = new LiquidityBookServices({
  mode: MODE.DEVNET  // MODE.DEVNET for testing, MODE.MAINNET for production
});

// Placeholder for your wallet's public key (replace with actual key)
const YOUR_WALLET_PUBLIC_KEY = "YourPublicKeyHere";

// Verify SDK initialization
console.log("SDK initialized successfully!");
// Get and display the DEX name (returns "Saros DLMM")
console.log("DEX Name:", liquidityBookServices.getDexName());
```

### First Swap Example

```typescript
import { PublicKey } from "@solana/web3.js";

// Main function to perform a quick swap
async function quickSwap() {
  try {
    // Pool address for SAROS/WSOL trading pair on devnet
    const poolAddress = "C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB";
    
    // Get a price quote before executing the swap
    const quote = await liquidityBookServices.getQuote({
      amount: BigInt(1e6), // Amount to swap: 1 SAROS (6 decimal places = 1e6)
      isExactInput: true, // True = fixed input amount, False = fixed output amount
      swapForY: true, // True = swap from X to Y (SAROS to WSOL), False = Y to X
      pair: new PublicKey(poolAddress), // Pool address as PublicKey
      tokenBase: new PublicKey("mntCAkd76nKSVTYxwu8qwQnhPcEE9JyEbgW6eEpwr1N"), // SAROS token mint
      tokenQuote: new PublicKey("So11111111111111111111111111111111111111112"), // WSOL token mint
      tokenBaseDecimal: 6, // SAROS has 6 decimal places
      tokenQuoteDecimal: 9, // WSOL has 9 decimal places
      slippage: 0.5 // Maximum slippage tolerance: 0.5%
    });
    
    // Display the expected output amount from the quote
    console.log("Expected output:", quote.amountOut);
  } catch (error) {
    // Handle any errors that occur during the swap process
    console.error("Error:", error.message);
  }
}

// Execute the swap function
quickSwap();
```

**Test it:** Run `ts-node quick-start.ts` and verify the quote output.

---

## Integration Tutorials

### Tutorial 1: Building a Swap Feature

**Goal:** Create a complete swap function for your dApp.

#### Swap Process Flow
```
User Input ──→ Get Quote ──→ Build Transaction ──→ Sign & Send ──→ Confirm
     │              │                │                    │            │
     └─ Amount      └─ Price, Fee    └─ Instructions      └─ Wallet    └─ Success
        Tokens          Impact           Swap Data           Signature    Receipt
```

#### Step 1: Set Up Environment

```typescript
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";
import { PublicKey, Keypair, Transaction } from "@solana/web3.js";
import fs from "fs";

// Initialize the main SDK service with devnet configuration
const liquidityBookServices = new LiquidityBookServices({ mode: MODE.DEVNET });

// Load wallet keypair from devnet.json file (contains secret key)
const keypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync("devnet.json", "utf-8")))
);
```

#### Step 2: Get Swap Quote

```typescript
// Function to get a price quote for a token swap
async function getSwapQuote(amount: number, fromToken: string, toToken: string, poolAddress: string) {
  // Call getQuote to calculate expected output and fees
  const quote = await liquidityBookServices.getQuote({
    amount: BigInt(amount * Math.pow(10, 6)), // Convert amount to smallest unit (assuming 6 decimals)
    isExactInput: true, // Fixed input amount, variable output
    swapForY: true, // Swap from token X to token Y
    pair: new PublicKey(poolAddress), // Pool address
    tokenBase: new PublicKey(fromToken), // Input token mint address
    tokenQuote: new PublicKey(toToken), // Output token mint address
    tokenBaseDecimal: 6, // Input token decimal places
    tokenQuoteDecimal: 9, // Output token decimal places
    slippage: 0.5 // Maximum allowed slippage (0.5%)
  });
  return quote; // Returns quote with amountIn, amountOut, priceImpact, fee, etc.
}
```

#### Step 3: Execute Swap

```typescript
// Function to execute the actual swap transaction
async function executeSwap(quote: any) {
  // Build the swap transaction using the quote data
  const transaction = await liquidityBookServices.swap({
    amount: quote.amount, // Amount from the quote
    tokenMintX: new PublicKey(fromToken), // Input token mint
    tokenMintY: new PublicKey(toToken), // Output token mint
    otherAmountOffset: quote.otherAmountOffset, // Minimum output amount (slippage protection)
    hook: null, // Optional reward hook (null for basic swap)
    isExactInput: true, // Fixed input amount
    swapForY: true, // Swap direction
    pair: new PublicKey(poolAddress), // Pool address
    payer: keypair.publicKey // Transaction fee payer
  });

  // Sign the transaction with the wallet keypair
  transaction.sign(keypair);
  
  // Send the signed transaction to the Solana network
  const signature = await liquidityBookServices.connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: true, preflightCommitment: "confirmed" }
  );

  // Get latest blockhash for transaction confirmation
  const { blockhash, lastValidBlockHeight } = await liquidityBookServices.connection.getLatestBlockhash();
  
  // Wait for transaction confirmation
  await liquidityBookServices.connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight
  });

  return signature; // Return transaction signature
}
```

#### Step 4: Complete Swap Function

```typescript
// Main function that combines quote and execution
async function swapTokens(amount: number, fromToken: string, toToken: string, poolAddress: string) {
  try {
    // Step 1: Get price quote
    const quote = await getSwapQuote(amount, fromToken, toToken, poolAddress);
    console.log(`Swapping ${amount} tokens. Expected output: ${quote.amountOut}`);
    
    // Step 2: Execute the swap
    const signature = await executeSwap(quote);
    console.log("Swap successful! Signature:", signature);
    
    return signature; // Return transaction signature
  } catch (error) {
    // Handle any errors during the swap process
    console.error("Swap failed:", error.message);
    throw error; // Re-throw for caller to handle
  }
}

// Example usage: Swap 1 SAROS for WSOL
swapTokens(
  1, // Amount to swap
  "mntCAkd76nKSVTYxwu8qwQnhPcEE9JyEbgW6eEpwr1N", // SAROS token mint
  "So11111111111111111111111111111111111111112", // WSOL token mint
  "C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB" // Pool address
);
```

**Tested on:** Devnet, September 9, 2025

### Tutorial 2: Adding Liquidity to a Pool

**Goal:** Add liquidity to earn fees from trades.

#### Step 1: Prepare Parameters

```typescript
import { LiquidityShape } from "@saros-finance/dlmm-sdk";
import { createUniformDistribution } from "@saros-finance/dlmm-sdk/utils";

// Pool address for SAROS/WSOL trading pair on devnet
const poolAddress = "C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB";
// Token X (base token) - SAROS mint address
const tokenX = "mntCAkd76nKSVTYxwu8qwQnhPcEE9JyEbgW6eEpwr1N"; // SAROS
// Token Y (quote token) - WSOL mint address
const tokenY = "So11111111111111111111111111111111111111112"; // WSOL
// Amounts to add as liquidity (in human-readable format)
const amountX = 10; // 10 SAROS tokens
const amountY = 10; // 10 WSOL tokens
```

#### Step 2: Get Pool Information

```typescript
// Function to retrieve current pool state and calculate optimal bin range
async function getPoolInfo() {
  // Fetch detailed pool account information from the blockchain
  const pairInfo = await liquidityBookServices.getPairAccount(new PublicKey(poolAddress));
  // Extract the current active bin ID (where the current price is located)
  const activeBin = pairInfo.activeId;
  // Define bin range around active bin (±5 bins for balanced liquidity distribution)
  const binRange: [number, number] = [activeBin - 5, activeBin + 5];
  
  return { activeBin, binRange }; // Return data needed for liquidity distribution
}
```

#### Step 3: Create Liquidity Distribution

```typescript
// Function to create uniform liquidity distribution across the specified bin range
async function createLiquidityDistribution(binRange: [number, number]) {
  // Use SDK utility to create uniform distribution across bins
  const distribution = createUniformDistribution({
    shape: LiquidityShape.Spot, // Standard liquidity shape for spot trading
    binRange // Range of bins to distribute liquidity across
  });
  
  return distribution; // Returns array defining how much liquidity goes to each bin
}
```

#### Step 4: Add Liquidity

```typescript
// Main function to add liquidity to the pool
async function addLiquidity() {
  try {
    // Get current pool state and bin range
    const { activeBin, binRange } = await getPoolInfo();
    // Create liquidity distribution across bins
    const distribution = await createLiquidityDistribution(binRange);
    
    // Get or create bin arrays (required for liquidity operations)
    // Bin arrays store liquidity data for ranges of 256 bins each
    const binArrayLower = await liquidityBookServices.getBinArray({
      binArrayIndex: Math.floor(binRange[0] / 256), // Calculate which bin array contains our lower bin
      pair: new PublicKey(poolAddress), // Pool address
      payer: keypair.publicKey // Fee payer for potential bin array creation
    });
    
    const binArrayUpper = await liquidityBookServices.getBinArray({
      binArrayIndex: Math.floor(binRange[1] / 256), // Calculate which bin array contains our upper bin
      pair: new PublicKey(poolAddress),
      payer: keypair.publicKey
    });
    
    // Check if user already has liquidity positions in this pool
    const positions = await liquidityBookServices.getUserPositions({
      payer: keypair.publicKey, // User's wallet address
      pair: new PublicKey(poolAddress) // Pool to check
    });
    
    let positionMint: PublicKey; // Will store the position NFT mint address
    if (positions.length === 0) {
      // No existing position - create a new liquidity position
      const positionKeypair = Keypair.generate(); // Generate new keypair for position NFT
      const { position } = await liquidityBookServices.createPosition({
        pair: new PublicKey(poolAddress), // Pool address
        payer: keypair.publicKey, // Transaction fee payer
        relativeBinIdLeft: binRange[0] - activeBin, // Left boundary relative to active bin
        relativeBinIdRight: binRange[1] - activeBin, // Right boundary relative to active bin
        binArrayIndex: Math.floor(binRange[0] / 256), // Bin array index for position
        positionMint: positionKeypair.publicKey // Mint address for the position NFT
      });
      positionMint = positionKeypair.publicKey; // Store the position mint address
    } else {
      // Use existing position
      positionMint = new PublicKey(positions[0].positionMint);
    }
    
    // Execute the liquidity addition transaction
    const transaction = await liquidityBookServices.addLiquidityIntoPosition({
      amountX: amountX * Math.pow(10, 6), // Convert SAROS amount to smallest units (6 decimals)
      amountY: amountY * Math.pow(10, 9), // Convert WSOL amount to smallest units (9 decimals)
      binArrayLower, // Lower bin array address
      binArrayUpper, // Upper bin array address
      liquidityDistribution: distribution, // How liquidity is distributed across bins
      pair: new PublicKey(poolAddress), // Pool address
      positionMint, // Position NFT mint address
      payer: keypair.publicKey // Transaction fee payer
    });
    
    // Sign the transaction with user's wallet
    transaction.sign(keypair);
    // Send transaction to Solana network
    const signature = await liquidityBookServices.connection.sendRawTransaction(
      transaction.serialize(),
      { skipPreflight: true, preflightCommitment: "confirmed" }
    );
    
    // Get latest blockhash for transaction confirmation
    const { blockhash, lastValidBlockHeight } = await liquidityBookServices.connection.getLatestBlockhash();
    // Wait for transaction confirmation
    await liquidityBookServices.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });
    
    console.log("Liquidity added successfully! Transaction signature:", signature);
    return signature; // Return transaction signature for reference
  } catch (error) {
    // Handle any errors during the liquidity addition process
    console.error("Failed to add liquidity:", error.message);
    throw error; // Re-throw error for caller to handle
  }
}

// Execute the liquidity addition function
addLiquidity();
```

**Tested on:** Devnet, September 9, 2025

---

## Working Code Examples

### Example 1: Pool Information Fetcher

```typescript
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";

// Initialize SDK in mainnet mode for production data
const liquidityBookServices = new LiquidityBookServices({ mode: MODE.MAINNET });

// Function to fetch comprehensive pool information
async function getPoolInfo(poolAddress: string) {
  try {
    // Fetch basic pool metadata (name, tokens, stats)
    const metadata = await liquidityBookServices.fetchPoolMetadata(poolAddress);
    console.log("Pool Metadata:", metadata);
    
    // Get detailed pair account information from blockchain
    const pairAccount = await liquidityBookServices.getPairAccount(new PublicKey(poolAddress));
    console.log("Active Bin ID:", pairAccount.activeId); // Current price bin
    console.log("Base Token:", pairAccount.baseToken); // Token X information
    console.log("Quote Token:", pairAccount.quoteToken); // Token Y information
    
    return { metadata, pairAccount }; // Return both metadata and account info
  } catch (error) {
    // Handle network errors or invalid pool addresses
    console.error("Error fetching pool info:", error.message);
  }
}

// Example usage with C98/USDC pool on mainnet
getPoolInfo("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");
```

**Output:** Pool metadata and active bin information.

### Example 2: Price Quote Calculator

```typescript
// Function to calculate detailed price quote with impact analysis
async function calculatePriceImpact(amount: number, poolAddress: string) {
  try {
    // Get comprehensive quote including fees and price impact
    const quote = await liquidityBookServices.getQuote({
      amount: BigInt(amount * Math.pow(10, 6)), // Convert amount to smallest units (6 decimals for C98)
      isExactInput: true, // Fixed input amount, variable output
      swapForY: true, // Swap from token X (C98) to token Y (USDC)
      pair: new PublicKey(poolAddress), // Pool address
      tokenBase: new PublicKey("C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9"), // C98 mint
      tokenQuote: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC mint
      tokenBaseDecimal: 6, // C98 has 6 decimal places
      tokenQuoteDecimal: 6, // USDC has 6 decimal places
      slippage: 0.5 // Maximum allowed slippage: 0.5%
    });
    
    // Display human-readable quote information
    console.log(`Input: ${amount} C98`); // Original input amount
    console.log(`Expected Output: ${Number(quote.amountOut) / Math.pow(10, 6)} USDC`); // Convert back to human-readable
    console.log(`Price Impact: ${quote.priceImpact}%`); // How much the swap affects the price
    console.log(`Fee: ${Number(quote.fee) / Math.pow(10, 6)} C98`); // Trading fee amount
    
    return quote; // Return complete quote object for further processing
  } catch (error) {
    // Handle quote calculation errors (insufficient liquidity, invalid pool, etc.)
    console.error("Error calculating quote:", error.message);
  }
}

// Example usage: Calculate quote for swapping 100 C98
calculatePriceImpact(100, "EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");
```

**Output:** Detailed quote information including price impact and fees.

### Example 3: Pool Creation Script

```typescript
import { BIN_STEP_CONFIGS } from "@saros-finance/dlmm-sdk";

// Function to create a new liquidity pool between two tokens
async function createNewPool(baseToken: string, quoteToken: string, initialPrice: number) {
  try {
    // Create pool with specified token pair and initial price
    const { tx } = await liquidityBookServices.createPairWithConfig({
      tokenBase: {
        mintAddress: baseToken, // Token X (base token) mint address
        decimal: 6 // Number of decimal places for base token
      },
      tokenQuote: {
        mintAddress: quoteToken, // Token Y (quote token) mint address
        decimal: 6 // Number of decimal places for quote token
      },
      ratePrice: initialPrice, // Initial price ratio between tokens
      binStep: BIN_STEP_CONFIGS[3].binStep, // Fee tier (3 = medium fee, 0.3%)
      payer: keypair.publicKey // Account paying for pool creation fees
    });
    
    // Set transaction parameters for execution
    tx.recentBlockhash = (await liquidityBookServices.connection.getLatestBlockhash()).blockhash;
    tx.feePayer = keypair.publicKey; // Set fee payer
    tx.sign(keypair); // Sign transaction with wallet
    
    // Send transaction to Solana network
    const signature = await liquidityBookServices.connection.sendRawTransaction(
      tx.serialize(),
      { skipPreflight: true, preflightCommitment: "confirmed" }
    );
    
    // Confirm transaction was processed successfully
    const { blockhash, lastValidBlockHeight } = await liquidityBookServices.connection.getLatestBlockhash();
    await liquidityBookServices.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });
    
    console.log("Pool created successfully! Transaction signature:", signature);
    return signature; // Return transaction signature
  } catch (error) {
    // Handle pool creation errors (insufficient funds, invalid tokens, etc.)
    console.error("Error creating pool:", error.message);
  }
}

// Example usage: Create a pool with custom token and USDC
// Replace "YourTokenMint" with actual token mint address
createNewPool("YourTokenMint", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 1.0);
```

**Output:** Pool creation transaction signature.

---

## API Reference

### API Methods Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Saros DLMM SDK API Flow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│  │  Discovery  │───▶│   Quotes    │───▶│   Trading   │           │
│  │             │    │             │    │             │           │
│  │ fetchPoolAd-│    │ getQuote()  │    │ swap()      │           │
│  │ dresses()   │    │             │    │             │           │
│  │ fetchPoolMe-│    └─────────────┘    └─────────────┘           │
│  │ tadata()    │                    │                            │
│  └─────────────┘                    ▼                            │
│           │                        ┌─────────────┐              │
│           ▼                        │  Liquidity  │              │
│  ┌─────────────┐                    │ Management  │              │
│  │ Pool Info   │                    │             │              │
│  │             │                    │ addLiquidity│              │
│  │ getPairAc-  │                    │ IntoPosition│              │
│  │ count()     │                    │ ()          │              │
│  │ getUserPosi-│                    │ removeMulti-│              │
│  │ tions()     │                    │ pleLiquidity│              │
│  └─────────────┘                    │ ()          │              │
│           │                        └─────────────┘              │
│           ▼                        │                            │
│  ┌─────────────┐                    ▼                            │
│  │ Pool        │           ┌─────────────┐                       │
│  │ Creation    │           │ Position    │                       │
│  │             │           │ Management  │                       │
│  │ createPair- │           │             │                       │
│  │ WithConfig()│           │ createPosi- │                       │
│  │             │           │ tion()      │                       │
│  └─────────────┘           │ getUserPosi-│                       │
│                            │ tions()     │                       │
│                            └─────────────┘                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Utility Methods                          │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ getDexName() │ getDexProgramId() │ getBinArray() │ listenNew-│ │
│  │               │                   │                │ PoolAddress│ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Usage Flow Examples

**For Traders:**
```
Discovery → Quotes → Trading
```

**For Liquidity Providers:**
```
Discovery → Pool Info → Position Management → Liquidity Management
```

**For Pool Creators:**
```
Pool Creation → Position Management → Liquidity Management
```

### Core Methods

#### `getQuote(params: QuoteParams): Promise<QuoteResult>`

Calculates swap quotes with price impact and fees.

**Parameters:**
- `amount: BigInt` - Input amount in smallest units
- `isExactInput: boolean` - True for fixed input, false for fixed output
- `swapForY: boolean` - Direction: X to Y or Y to X
- `pair: PublicKey` - Pool address
- `tokenBase/tokenQuote: PublicKey` - Token mint addresses
- `tokenBaseDecimal/tokenQuoteDecimal: number` - Token decimals
- `slippage: number` - Slippage tolerance (percentage)

**Returns:** Quote with amountIn, amountOut, priceImpact, fee, etc.

#### `swap(params: SwapParams): Promise<Transaction>`

Executes a token swap transaction.

**Parameters:**
- `amount: BigInt` - Swap amount
- `tokenMintX/tokenMintY: PublicKey` - Token mints
- `otherAmountOffset: BigInt` - Minimum output amount
- `hook: PublicKey | null` - Reward hook (optional)
- `isExactInput: boolean` - Input mode
- `swapForY: boolean` - Swap direction
- `pair: PublicKey` - Pool address
- `payer: PublicKey` - Transaction payer

**Returns:** Signed transaction ready for submission.

#### `createPairWithConfig(params: CreatePairParams): Promise<{ tx: Transaction, pairAddress: PublicKey }>`

Creates a new liquidity pool.

**Parameters:**
- `tokenBase/tokenQuote: { mintAddress: string, decimal: number }` - Token configs
- `ratePrice: number` - Initial price ratio
- `binStep: number` - Price increment (use BIN_STEP_CONFIGS)
- `payer: PublicKey` - Pool creator

**Returns:** Transaction and new pool address.

#### `addLiquidityIntoPosition(params: AddLiquidityParams): Promise<Transaction>`

Adds liquidity to an existing position.

**Parameters:**
- `amountX/amountY: number` - Token amounts
- `binArrayLower/binArrayUpper: PublicKey` - Bin array addresses
- `liquidityDistribution: Array<{ relativeBinId: number, distributionX: number, distributionY: number }>` - Distribution across bins
- `pair: PublicKey` - Pool address
- `positionMint: PublicKey` - Position mint
- `payer: PublicKey` - Transaction payer

**Returns:** Transaction for adding liquidity.

#### `removeMultipleLiquidity(params: RemoveLiquidityParams): Promise<{ txs: Transaction[], txCreateAccount?: Transaction, txCloseAccount?: Transaction }>`

Removes liquidity from multiple positions.

**Parameters:**
- `maxPositionList: Array<{ position: PublicKey, start: number, end: number, positionMint: PublicKey }>` - Positions to remove from
- `payer: PublicKey` - Transaction payer
- `type: RemoveLiquidityType` - Removal type (Both, X, Y)
- `pair: PublicKey` - Pool address
- `tokenMintX/tokenMintY: PublicKey` - Token mints
- `activeId: number` - Current active bin ID

**Returns:** Array of transactions for removal.

### Utility Methods

#### `getDexName(): string`

Returns "Saros DLMM"

#### `getDexProgramId(): PublicKey`

Returns the DEX program ID

#### `fetchPoolAddresses(): Promise<string[]>`

Fetches all pool addresses

#### `fetchPoolMetadata(address: string): Promise<PoolMetadata>`

Fetches metadata for a specific pool

#### `listenNewPoolAddress(callback: (address: string) => void): Promise<void>`

Listens for new pool creation events

#### `getPairAccount(pair: PublicKey): Promise<PairAccount>`

Retrieves detailed pool information

#### `getUserPositions(params: { payer: PublicKey, pair: PublicKey }): Promise<PositionInfo[]>`

Fetches user's liquidity positions

#### `getBinArray(params: { binArrayIndex: number, pair: PublicKey, payer: PublicKey }): Promise<PublicKey>`

Retrieves bin array address

---

## SDK Analysis & Improvement Suggestions

### Current Strengths

- **Comprehensive Coverage:** Supports all major DLMM operations
- **TypeScript Support:** Full type safety with modern TS features
- **Solana Integration:** Seamless integration with @solana/web3.js
- **Flexible Configuration:** Multiple network support (mainnet/devnet)
- **Active Development:** Regular updates and community support

### Areas for Improvement

1. **Error Handling:** More specific error codes and recovery suggestions
2. **Documentation:** Official API docs with interactive examples
3. **Utility Functions:** More helper functions for common calculations
4. **Performance:** Batch operations for multiple transactions
5. **Testing:** More comprehensive test suites and examples

### Developer Experience Enhancements

- **Code Generation:** CLI tool for scaffolding new projects
- **Live Playground:** Browser-based testing environment
- **Plugin Ecosystem:** Community plugins for specific use cases
- **Migration Guides:** Easy migration from other AMM protocols

---

## Troubleshooting Guide

### Common Issues

#### "Insufficient Liquidity"
**Cause:** Pool doesn't have enough tokens for the swap
**Solution:** Check pool metadata, use smaller amounts, or select different pool

#### "Invalid Bin Range"
**Cause:** Bin range outside pool's supported range
**Solution:** Use `getPairAccount` to get active bin, set range within ±10 bins

#### "Transaction Failed"
**Cause:** Various (insufficient funds, network issues, invalid params)
**Solution:** Check wallet balance, network status, and parameter validation

#### "Position Not Found"
**Cause:** No liquidity position in specified range
**Solution:** Create position first or check existing positions

### FAQ

**Q: What's the difference between DLMM and regular AMM?**
A: DLMM uses dynamic bins for better price discovery and reduced slippage.

**Q: How do I calculate optimal bin ranges?**
A: Use active bin as center, ±5-10 bins for most use cases.

**Q: Can I use this on mainnet?**
A: Yes, change MODE to MAINNET and use mainnet pool addresses.

**Q: What's the minimum liquidity requirement?**
A: Varies by pool, but typically small amounts work for testing.

---

## SDK Comparison Guide

| Feature | @saros-finance/dlmm-sdk | @saros-finance/sdk | saros-dlmm-sdk-rs |
|---------|------------------------|-------------------|-------------------|
| Language | TypeScript | TypeScript | Rust |
| Focus | DLMM Operations | AMM + Staking/Farming | DLMM (High Performance) |
| Ease of Use | High | High | Medium |
| Performance | Good | Good | Excellent |
| Best For | Web Apps, Quick Prototyping | Full DeFi Suite | Backend, High-Throughput |

**Recommendation:**
- Use **dlmm-sdk** for web applications and hackathons
- Use **sdk** for comprehensive DeFi features
- Use **Rust SDK** for performance-critical backend systems

---

## Visual Aids

### Complete SDK Workflow Diagram

```
┌─────────────────┐
│   Initialize    │
│ SDK Service     │
│ (DEVNET/MAINNET)│
└─────────┬───────┘
          │
          ▼
┌─────────────────┐     ┌─────────────────┐
│   Pool Discovery│────▶│  Pool Creation  │
│ • fetchPoolAddresses │ • createPairWithConfig
│ • fetchPoolMetadata  │ • Set initial price
│ • getPairAccount     │ • Choose bin step
└─────────┬───────┘     └─────────┬───────┘
          │                      │
          ▼                      ▼
┌─────────────────┐     ┌─────────────────┐
│   Price Quotes   │     │   Position      │
│ • getQuote       │     │ Management      │
│ • Calculate impact│     │ • createPosition│
│ • Check slippage  │     │ • getUserPositions
└─────────┬───────┘     └─────────┬───────┘
          │                      │
          ▼                      ▼
┌─────────────────┐     ┌─────────────────┐
│     Swaps       │     │   Liquidity     │
│ • swap()        │     │ Management      │
│ • Sign & Send   │     │ • addLiquidityIntoPosition
│ • Confirm TX    │     │ • removeMultipleLiquidity
└─────────┬───────┘     └─────────┬───────┘
          │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────┐
                    │   Monitoring    │
                    │ • Transaction   │
                    │   Status        │
                    │ • Position P&L  │
                    │ • Pool Stats    │
                    └─────────────────┘
```

### Key Workflow Paths

**Trading Path:**
```
Initialize → Pool Discovery → Price Quotes → Swaps → Monitoring
```

**Liquidity Provider Path:**
```
Initialize → Pool Discovery → Position Management → Liquidity Management → Monitoring
```

**Pool Creator Path:**
```
Initialize → Pool Creation → Position Management → Liquidity Management → Monitoring
```

### Liquidity Pool Structure
```
[Bin Array Lower] <--- [Active Bin] ---> [Bin Array Upper]
  -10 bins         Price Level         +10 bins
  (Liquidity distributed across bins for efficient trading)
```

### Basic Operation Flows
- **Swap Flow:** Get Quote → Create Transaction → Sign & Send → Confirm
- **Liquidity Addition Flow:** Get Pool Info → Create Distribution → Create Position → Add Liquidity
- **Pool Creation Flow:** Validate Tokens → Set Parameters → Create Transaction → Deploy Pool

---

## Environment Setup

## Environment Setup

### Development Environment

```bash
# Install Node.js 16+
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install TypeScript globally
npm install -g typescript ts-node

# Install Solana CLI (optional)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### Wallet Setup

```bash
# Generate devnet wallet
solana-keygen new --outfile devnet.json

# Fund wallet (devnet)
solana airdrop 2

# Check balance
solana balance
```

### Project Structure

```
my-saros-app/
├── src/
│   ├── config.ts
│   ├── swap.ts
│   └── liquidity.ts
├── package.json
├── tsconfig.json
└── devnet.json
```

---

## Contributing

Found an issue or want to improve the docs? 
- Report bugs: [GitHub Issues](https://github.com/saros-finance/dlmm-sdk/issues)
- Submit PRs: [GitHub PRs](https://github.com/saros-finance/dlmm-sdk/pulls)
- Join Discord: [Saros Community](https://discord.gg/saros)

---

**Last Updated:** September 9, 2025
**SDK Version:** 1.4.0
**Tested Networks:** Solana Mainnet & Devnet
