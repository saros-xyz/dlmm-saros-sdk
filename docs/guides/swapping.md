# Token Swapping Guide

Complete guide to performing token swaps on Saros DLMM with optimal routing, slippage protection, and error handling.

## Overview

Token swapping is the core functionality of any DEX. Saros DLMM provides efficient, capital-efficient swaps with advanced features like dynamic fees and concentrated liquidity.

## Prerequisites

- ✅ Saros DLMM SDK installed
- ✅ Solana wallet with SOL and tokens
- ✅ Basic understanding of token addresses and decimals

## Quick Swap Example

```typescript
import {
  LiquidityBookServices,
  MODE
} from "@saros-finance/dlmm-sdk";
import { PublicKey, Keypair } from "@solana/web3.js";

async function quickSwap() {
  // Initialize SDK
  const lbServices = new LiquidityBookServices({
    mode: MODE.MAINNET
  });

  // Pool configuration
  const C98_USDC_POOL = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");
  const C98_MINT = new PublicKey("C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9");
  const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

  // User wallet (replace with actual wallet)
  const userWallet = Keypair.generate();

  try {
    // Step 1: Get quote
    console.log("🔍 Getting swap quote...");
    const quote = await lbServices.getQuote({
      amount: BigInt(1000000), // 1 C98
      isExactInput: true,
      swapForY: true, // C98 -> USDC
      pair: C98_USDC_POOL,
      tokenBase: C98_MINT,
      tokenQuote: USDC_MINT,
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 6,
      slippage: 0.5 // 0.5% slippage
    });

    console.log(`📊 Expected output: ${quote.amountOut} USDC`);
    console.log(`📈 Price impact: ${quote.priceImpact}%`);

    // Step 2: Create swap transaction
    console.log("⚡ Creating swap transaction...");
    const swapTx = await lbServices.swap({
      amount: quote.amount,
      tokenMintX: C98_MINT,
      tokenMintY: USDC_MINT,
      otherAmountOffset: quote.otherAmountOffset,
      swapForY: true,
      isExactInput: true,
      pair: C98_USDC_POOL,
      payer: userWallet.publicKey,
      hook: lbServices.hooksConfig
    });

    // Step 3: Submit transaction
    console.log("📤 Submitting transaction...");
    const signature = await submitTransaction(swapTx, userWallet);

    console.log(`✅ Swap completed! TX: ${signature}`);

  } catch (error) {
    console.error("❌ Swap failed:", error);
    handleSwapError(error);
  }
}
```

## Detailed Implementation

### Step 1: Environment Setup

```typescript
import {
  LiquidityBookServices,
  MODE,
  BIN_STEP_CONFIGS
} from "@saros-finance/dlmm-sdk";
import {
  PublicKey,
  Keypair,
  Transaction,
  Connection
} from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

// Initialize SDK
const lbServices = new LiquidityBookServices({
  mode: MODE.MAINNET
});

// Your wallet (replace with wallet adapter in production)
const userWallet = Keypair.generate();

// Token addresses
const TOKENS = {
  C98: new PublicKey("C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9"),
  USDC: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  WSOL: new PublicKey("So11111111111111111111111111111111111111112")
};

// Pool addresses
const POOLS = {
  C98_USDC: new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD"),
  WSOL_USDC: new PublicKey("27Y8nGm9HrWr9cN6CXQRmhHQD9sW2JvZ8AqZ6Q1w9J9")
};
```

### Step 2: Getting Quotes

#### Basic Quote

```typescript
async function getBasicQuote(
  inputMint: PublicKey,
  outputMint: PublicKey,
  amount: bigint,
  poolAddress: PublicKey
) {
  const quote = await lbServices.getQuote({
    amount,
    isExactInput: true,
    swapForY: true, // Adjust based on token order
    pair: poolAddress,
    tokenBase: inputMint,
    tokenQuote: outputMint,
    tokenBaseDecimal: 6, // Adjust based on token
    tokenQuoteDecimal: 6,
    slippage: 0.5
  });

  return {
    inputAmount: quote.amountIn,
    outputAmount: quote.amountOut,
    priceImpact: quote.priceImpact,
    transactionAmount: quote.amount,
    slippageOffset: quote.otherAmountOffset
  };
}
```

#### Advanced Quote with Analysis

```typescript
async function getAdvancedQuote(
  inputMint: PublicKey,
  outputMint: PublicKey,
  amount: bigint,
  poolAddress: PublicKey
) {
  // Get basic quote
  const quote = await lbServices.getQuote({
    amount,
    isExactInput: true,
    swapForY: true,
    pair: poolAddress,
    tokenBase: inputMint,
    tokenQuote: outputMint,
    tokenBaseDecimal: 6,
    tokenQuoteDecimal: 6,
    slippage: 0.5
  });

  // Get pool information for analysis
  const pairInfo = await lbServices.getPairAccount(poolAddress);
  const currentPrice = getPriceFromId(pairInfo.activeId, pairInfo.binStep);

  // Calculate fees
  const feeAmount = (Number(amount) * pairInfo.staticFeeParameters.baseFactor) / 10000;
  const feePercentage = (feeAmount / Number(amount)) * 100;

  return {
    ...quote,
    currentPrice,
    feeAmount,
    feePercentage,
    priceImpactPercentage: quote.priceImpact,
    minimumOutput: Number(quote.amountOut) * (1 - 0.005), // 0.5% slippage
    estimatedGas: 5000 // lamports
  };
}
```

### Step 3: Creating Swap Transactions

#### Single Swap Transaction

```typescript
async function createSwapTransaction(
  quote: any,
  inputMint: PublicKey,
  outputMint: PublicKey,
  poolAddress: PublicKey,
  userWallet: Keypair
) {
  const swapTx = await lbServices.swap({
    amount: quote.amount,
    tokenMintX: inputMint,
    tokenMintY: outputMint,
    otherAmountOffset: quote.otherAmountOffset,
    swapForY: true,
    isExactInput: true,
    pair: poolAddress,
    payer: userWallet.publicKey,
    hook: lbServices.hooksConfig
  });

  return swapTx;
}
```

#### Batch Swap Transaction

```typescript
async function createBatchSwap(
  swaps: Array<{
    quote: any;
    inputMint: PublicKey;
    outputMint: PublicKey;
    poolAddress: PublicKey;
  }>,
  userWallet: Keypair
) {
  const batchTx = new Transaction();

  for (const swap of swaps) {
    const swapTx = await lbServices.swap({
      amount: swap.quote.amount,
      tokenMintX: swap.inputMint,
      tokenMintY: swap.outputMint,
      otherAmountOffset: swap.quote.otherAmountOffset,
      swapForY: true,
      isExactInput: true,
      pair: swap.poolAddress,
      payer: userWallet.publicKey,
      hook: lbServices.hooksConfig
    });

    // Add instructions to batch transaction
    batchTx.add(...swapTx.instructions);
  }

  return batchTx;
}
```

### Step 4: Transaction Submission

#### Basic Submission

```typescript
async function submitTransaction(
  tx: Transaction,
  wallet: Keypair
): Promise<string> {
  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } =
    await lbServices.connection.getLatestBlockhash();

  // Update transaction
  tx.recentBlockhash = blockhash;
  tx.feePayer = wallet.publicKey;
  tx.sign(wallet);

  // Submit transaction
  const signature = await lbServices.connection.sendRawTransaction(
    tx.serialize(),
    {
      skipPreflight: false,
      preflightCommitment: "confirmed"
    }
  );

  // Wait for confirmation
  await lbServices.connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight
  }, "confirmed");

  return signature;
}
```

#### Advanced Submission with Retry

```typescript
async function submitTransactionWithRetry(
  tx: Transaction,
  wallet: Keypair,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}`);

      const signature = await submitTransaction(tx, wallet);
      console.log(`✅ Transaction confirmed: ${signature}`);
      return signature;

    } catch (error) {
      console.log(`❌ Attempt ${attempt} failed:`, error.message);
      lastError = error;

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError.message}`);
}
```

### Step 5: Monitoring and Analytics

#### Transaction Monitoring

```typescript
async function monitorTransaction(signature: string) {
  // Get transaction details
  const tx = await lbServices.connection.getTransaction(signature, {
    commitment: "confirmed"
  });

  if (!tx) {
    throw new Error("Transaction not found");
  }

  // Analyze transaction
  const { meta } = tx;
  const success = meta.err === null;
  const fee = meta.fee;
  const logs = meta.logMessages;

  return {
    signature,
    success,
    fee,
    logs,
    slot: tx.slot,
    timestamp: tx.blockTime
  };
}
```

#### Swap Analytics

```typescript
async function analyzeSwap(
  signature: string,
  inputAmount: bigint,
  expectedOutput: bigint
) {
  const txAnalysis = await monitorTransaction(signature);

  if (!txAnalysis.success) {
    return {
      success: false,
      error: "Transaction failed",
      details: txAnalysis
    };
  }

  // Calculate actual performance
  const actualOutput = await getActualOutputFromLogs(txAnalysis.logs);
  const slippage = ((Number(expectedOutput) - Number(actualOutput)) / Number(expectedOutput)) * 100;
  const effectivePrice = Number(actualOutput) / Number(inputAmount);

  return {
    success: true,
    actualOutput,
    slippage,
    effectivePrice,
    gasUsed: txAnalysis.fee,
    details: txAnalysis
  };
}
```

## Advanced Features

### Multi-Hop Swapping

```typescript
async function multiHopSwap(
  inputMint: PublicKey,
  intermediateMint: PublicKey,
  outputMint: PublicKey,
  amount: bigint,
  pools: PublicKey[]
) {
  // First hop: INPUT -> INTERMEDIATE
  const firstQuote = await lbServices.getQuote({
    amount,
    isExactInput: true,
    swapForY: true,
    pair: pools[0],
    tokenBase: inputMint,
    tokenQuote: intermediateMint,
    tokenBaseDecimal: 6,
    tokenQuoteDecimal: 6,
    slippage: 0.5
  });

  // Second hop: INTERMEDIATE -> OUTPUT
  const secondQuote = await lbServices.getQuote({
    amount: firstQuote.amountOut,
    isExactInput: true,
    swapForY: true,
    pair: pools[1],
    tokenBase: intermediateMint,
    tokenQuote: outputMint,
    tokenBaseDecimal: 6,
    tokenQuoteDecimal: 6,
    slippage: 0.5
  });

  // Create batch transaction
  const batchTx = new Transaction();

  // Add first swap
  const firstSwapTx = await lbServices.swap({
    amount: firstQuote.amount,
    tokenMintX: inputMint,
    tokenMintY: intermediateMint,
    otherAmountOffset: firstQuote.otherAmountOffset,
    swapForY: true,
    isExactInput: true,
    pair: pools[0],
    payer: userWallet.publicKey
  });
  batchTx.add(...firstSwapTx.instructions);

  // Add second swap
  const secondSwapTx = await lbServices.swap({
    amount: secondQuote.amount,
    tokenMintX: intermediateMint,
    tokenMintY: outputMint,
    otherAmountOffset: secondQuote.otherAmountOffset,
    swapForY: true,
    isExactInput: true,
    pair: pools[1],
    payer: userWallet.publicKey
  });
  batchTx.add(...secondSwapTx.instructions);

  return {
    totalInput: amount,
    expectedOutput: secondQuote.amountOut,
    priceImpact: firstQuote.priceImpact + secondQuote.priceImpact,
    transaction: batchTx
  };
}
```

### Smart Slippage Management

```typescript
async function getOptimalSlippage(
  poolAddress: PublicKey,
  amount: bigint,
  volatilityThreshold: number = 0.02 // 2%
) {
  // Get pool volatility
  const pairInfo = await lbServices.getPairAccount(poolAddress);
  const volatility = pairInfo.dynamicFeeParameters.volatilityAccumulator;

  // Adjust slippage based on volatility
  let slippage = 0.5; // Base 0.5%

  if (volatility > volatilityThreshold) {
    slippage = Math.min(slippage * 2, 5.0); // Max 5%
  }

  return slippage;
}
```

## Error Handling

### Common Errors and Solutions

```typescript
function handleSwapError(error: Error) {
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes("slippage")) {
    console.log("💡 Solution: Increase slippage tolerance");
    console.log("   Current: 0.5%, Try: 1.0% or 2.0%");
  }

  else if (errorMessage.includes("insufficient")) {
    console.log("💡 Solution: Check token balances");
    console.log("   Ensure you have enough tokens for the swap");
  }

  else if (errorMessage.includes("invalid")) {
    console.log("💡 Solution: Verify token addresses and pool");
    console.log("   Check token mint addresses and pool address");
  }

  else if (errorMessage.includes("timeout")) {
    console.log("💡 Solution: Retry transaction");
    console.log("   Network congestion, try again later");
  }

  else if (errorMessage.includes("blockhash")) {
    console.log("💡 Solution: Refresh and retry");
    console.log("   Transaction expired, create new one");
  }

  else {
    console.log("💡 Solution: Check network status");
    console.log("   Verify Solana network is operational");
  }
}
```

### Retry Logic

```typescript
async function retrySwap(
  swapFunction: () => Promise<any>,
  maxRetries: number = 3,
  delay: number = 2000
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await swapFunction();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      console.log(`Retry ${attempt}/${maxRetries} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}
```

## Best Practices

### Performance Optimization

1. **Batch Operations** - Combine multiple swaps in one transaction
2. **Cache Quotes** - Reuse quotes for short periods
3. **Monitor Gas** - Track transaction costs
4. **Connection Reuse** - Reuse SDK connections

### Security Considerations

1. **Validate Inputs** - Always verify token addresses and amounts
2. **Slippage Protection** - Set appropriate slippage tolerances
3. **Balance Checks** - Verify sufficient token balances
4. **Transaction Limits** - Set maximum transaction amounts

### Monitoring

1. **Transaction Tracking** - Monitor all transaction statuses
2. **Performance Metrics** - Track swap success rates
3. **Error Logging** - Log errors with full context
4. **Analytics** - Track price impact and fees

## Complete Example

```typescript
// Complete swap workflow
async function completeSwapWorkflow() {
  try {
    // Setup
    const lbServices = new LiquidityBookServices({ mode: MODE.MAINNET });
    const userWallet = Keypair.generate(); // Replace with real wallet

    // Configuration
    const config = {
      inputMint: TOKENS.C98,
      outputMint: TOKENS.USDC,
      poolAddress: POOLS.C98_USDC,
      amount: BigInt(1000000), // 1 C98
      slippage: 0.5
    };

    // Step 1: Get quote with analysis
    console.log("📊 Getting detailed quote...");
    const quote = await getAdvancedQuote(
      config.inputMint,
      config.outputMint,
      config.amount,
      config.poolAddress
    );

    console.log(`Expected output: ${quote.outputAmount} USDC`);
    console.log(`Price impact: ${quote.priceImpactPercentage}%`);
    console.log(`Fee: ${quote.feePercentage}%`);

    // Step 2: Create transaction
    console.log("⚡ Creating swap transaction...");
    const swapTx = await createSwapTransaction(
      quote,
      config.inputMint,
      config.outputMint,
      config.poolAddress,
      userWallet
    );

    // Step 3: Submit with retry
    console.log("📤 Submitting transaction...");
    const signature = await submitTransactionWithRetry(swapTx, userWallet);

    // Step 4: Analyze results
    console.log("📈 Analyzing swap performance...");
    const analysis = await analyzeSwap(signature, config.amount, quote.outputAmount);

    console.log("✅ Swap completed successfully!");
    console.log(`Transaction: ${signature}`);
    console.log(`Actual slippage: ${analysis.slippage}%`);
    console.log(`Gas used: ${analysis.gasUsed} lamports`);

  } catch (error) {
    console.error("❌ Swap workflow failed:", error);
    handleSwapError(error);
  }
}

// Run the complete workflow
completeSwapWorkflow();
```

## Next Steps

- **[Liquidity Provision Guide](../liquidity-provision.md)** - Learn about providing liquidity
- **[Position Management](../position-management.md)** - Manage your positions
- **[Advanced Strategies](../advanced-strategies.md)** - Complex trading strategies

---

**Need help? Check our [Troubleshooting](../troubleshooting/) section or join our [Discord](https://discord.gg/saros)!**</content>
<parameter name="filePath">h:\Rahul Prasad 01\earn\Saros\docs\guides\swapping.md
