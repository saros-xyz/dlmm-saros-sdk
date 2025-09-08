# Batch Operations Example

Complete guide for performing multiple operations efficiently using batch transactions.

## Overview

Batch operations allow you to combine multiple actions into single transactions, reducing gas costs and improving efficiency.

## Prerequisites

- Node.js 16+
- npm or yarn
- Basic understanding of Solana transactions

## Setup

```typescript
import {
  LiquidityBookServices,
  PublicKey,
  Keypair,
  Transaction,
  Connection
} from "@saros-finance/dlmm-sdk";

// Initialize SDK
const lbServices = new LiquidityBookServices({
  cluster: "mainnet-beta"
});

// Your wallet
const wallet = Keypair.generate(); // Replace with your wallet

// Connection for transaction building
const connection = new Connection("https://api.mainnet-beta.solana.com");
```

## Example 1: Batch Swaps

```typescript
async function batchSwaps() {
  try {
    console.log("🔄 Performing batch swaps...");

    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    // Multiple swap instructions
    const swaps = [
      {
        amount: BigInt(1000000), // 1 token
        isExactInput: true,
        swapForY: true,
        minOutAmount: BigInt(950000) // 0.5% slippage
      },
      {
        amount: BigInt(2000000), // 2 tokens
        isExactInput: true,
        swapForY: false,
        minOutAmount: BigInt(1900000) // 0.5% slippage
      },
      {
        amount: BigInt(500000), // 0.5 tokens
        isExactInput: true,
        swapForY: true,
        minOutAmount: BigInt(475000) // 0.5% slippage
      }
    ];

    // Build transaction with multiple swaps
    const transaction = new Transaction();

    for (const swap of swaps) {
      const swapIx = await lbServices.createSwapInstruction({
        pair: poolAddress,
        user: wallet.publicKey,
        tokenIn: swap.swapForY ? pool.tokenX : pool.tokenY,
        tokenOut: swap.swapForY ? pool.tokenY : pool.tokenX,
        amount: swap.amount,
        minOutAmount: swap.minOutAmount,
        isExactInput: swap.isExactInput
      });

      transaction.add(swapIx);
    }

    // Sign and send
    const signature = await connection.sendTransaction(transaction, [wallet]);
    console.log("✅ Batch swaps completed:", signature);

  } catch (error) {
    console.error("❌ Batch swaps failed:", error.message);
  }
}
```

## Example 2: Batch Liquidity Operations

```typescript
async function batchLiquidityOperations() {
  try {
    console.log("💧 Performing batch liquidity operations...");

    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    // Multiple liquidity operations
    const operations = [
      {
        type: "add",
        amountX: BigInt(10000000), // 10 tokens X
        amountY: BigInt(10000000), // 10 tokens Y
        binId: 100
      },
      {
        type: "add",
        amountX: BigInt(5000000), // 5 tokens X
        amountY: BigInt(5000000), // 5 tokens Y
        binId: 101
      },
      {
        type: "remove",
        amount: BigInt(2000000), // Remove 2 tokens worth
        binId: 99
      }
    ];

    const transaction = new Transaction();

    for (const op of operations) {
      if (op.type === "add") {
        const addIx = await lbServices.createAddLiquidityInstruction({
          pair: poolAddress,
          user: wallet.publicKey,
          amountX: op.amountX,
          amountY: op.amountY,
          binId: op.binId,
          slippage: 0.5
        });
        transaction.add(addIx);
      } else if (op.type === "remove") {
        const removeIx = await lbServices.createRemoveLiquidityInstruction({
          pair: poolAddress,
          user: wallet.publicKey,
          amount: op.amount,
          binId: op.binId
        });
        transaction.add(removeIx);
      }
    }

    const signature = await connection.sendTransaction(transaction, [wallet]);
    console.log("✅ Batch liquidity operations completed:", signature);

  } catch (error) {
    console.error("❌ Batch liquidity operations failed:", error.message);
  }
}
```

## Example 3: Cross-Pool Operations

```typescript
async function crossPoolOperations() {
  try {
    console.log("🌐 Performing cross-pool operations...");

    const pools = [
      new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD"), // Pool 1
      new PublicKey("AnotherPoolAddressHere"), // Pool 2
      new PublicKey("ThirdPoolAddressHere") // Pool 3
    ];

    const transaction = new Transaction();

    // Swap on first pool
    const swap1 = await lbServices.createSwapInstruction({
      pair: pools[0],
      user: wallet.publicKey,
      tokenIn: pools[0].tokenX,
      tokenOut: pools[0].tokenY,
      amount: BigInt(5000000),
      minOutAmount: BigInt(4750000),
      isExactInput: true
    });
    transaction.add(swap1);

    // Add liquidity to second pool
    const addLiq = await lbServices.createAddLiquidityInstruction({
      pair: pools[1],
      user: wallet.publicKey,
      amountX: BigInt(10000000),
      amountY: BigInt(10000000),
      binId: 100,
      slippage: 0.5
    });
    transaction.add(addLiq);

    // Remove liquidity from third pool
    const removeLiq = await lbServices.createRemoveLiquidityInstruction({
      pair: pools[2],
      user: wallet.publicKey,
      amount: BigInt(5000000),
      binId: 99
    });
    transaction.add(removeLiq);

    const signature = await connection.sendTransaction(transaction, [wallet]);
    console.log("✅ Cross-pool operations completed:", signature);

  } catch (error) {
    console.error("❌ Cross-pool operations failed:", error.message);
  }
}
```

## Example 4: Batch Position Management

```typescript
async function batchPositionManagement() {
  try {
    console.log("📊 Managing multiple positions...");

    const positions = [
      {
        pair: new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD"),
        binId: 100,
        action: "claimFees"
      },
      {
        pair: new PublicKey("AnotherPoolAddressHere"),
        binId: 101,
        action: "addLiquidity",
        amountX: BigInt(2000000),
        amountY: BigInt(2000000)
      },
      {
        pair: new PublicKey("ThirdPoolAddressHere"),
        binId: 99,
        action: "removeLiquidity",
        amount: BigInt(1000000)
      }
    ];

    const transaction = new Transaction();

    for (const position of positions) {
      switch (position.action) {
        case "claimFees":
          const claimIx = await lbServices.createClaimFeesInstruction({
            pair: position.pair,
            user: wallet.publicKey,
            binId: position.binId
          });
          transaction.add(claimIx);
          break;

        case "addLiquidity":
          const addIx = await lbServices.createAddLiquidityInstruction({
            pair: position.pair,
            user: wallet.publicKey,
            amountX: position.amountX!,
            amountY: position.amountY!,
            binId: position.binId,
            slippage: 0.5
          });
          transaction.add(addIx);
          break;

        case "removeLiquidity":
          const removeIx = await lbServices.createRemoveLiquidityInstruction({
            pair: position.pair,
            user: wallet.publicKey,
            amount: position.amount!,
            binId: position.binId
          });
          transaction.add(removeIx);
          break;
      }
    }

    const signature = await connection.sendTransaction(transaction, [wallet]);
    console.log("✅ Batch position management completed:", signature);

  } catch (error) {
    console.error("❌ Batch position management failed:", error.message);
  }
}
```

## Example 5: Advanced Batch with Dependencies

```typescript
async function advancedBatchWithDependencies() {
  try {
    console.log("🔗 Advanced batch with dependencies...");

    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    // Step 1: Get current pool state
    const pool = await lbServices.getPairAccount(poolAddress);
    const currentPrice = pool.price;
    const activeBin = pool.activeBinId;

    console.log("Current price:", currentPrice);
    console.log("Active bin:", activeBin);

    // Step 2: Calculate optimal bins for liquidity
    const optimalBins = calculateOptimalBins(currentPrice, activeBin);

    // Step 3: Build transaction with calculated parameters
    const transaction = new Transaction();

    // First, claim any existing fees
    const claimIx = await lbServices.createClaimFeesInstruction({
      pair: poolAddress,
      user: wallet.publicKey,
      binId: activeBin
    });
    transaction.add(claimIx);

    // Then, add liquidity to optimal bins
    for (const bin of optimalBins) {
      const amountX = calculateAmountForBin(bin.binId, currentPrice, bin.percentage);
      const amountY = calculateAmountForBin(bin.binId, currentPrice, bin.percentage);

      const addIx = await lbServices.createAddLiquidityInstruction({
        pair: poolAddress,
        user: wallet.publicKey,
        amountX: BigInt(amountX),
        amountY: BigInt(amountY),
        binId: bin.binId,
        slippage: 0.5
      });
      transaction.add(addIx);
    }

    // Finally, perform a swap if needed
    if (shouldPerformSwap(currentPrice)) {
      const swapIx = await lbServices.createSwapInstruction({
        pair: poolAddress,
        user: wallet.publicKey,
        tokenIn: pool.tokenX,
        tokenOut: pool.tokenY,
        amount: BigInt(1000000),
        minOutAmount: BigInt(950000),
        isExactInput: true
      });
      transaction.add(swapIx);
    }

    const signature = await connection.sendTransaction(transaction, [wallet]);
    console.log("✅ Advanced batch completed:", signature);

  } catch (error) {
    console.error("❌ Advanced batch failed:", error.message);
  }
}

function calculateOptimalBins(currentPrice: number, activeBin: number) {
  // Calculate bins around current price for optimal liquidity
  const bins = [];
  const range = 5; // 5 bins on each side

  for (let i = -range; i <= range; i++) {
    const binId = activeBin + i;
    const percentage = i === 0 ? 0.4 : 0.1; // More liquidity at active bin
    bins.push({ binId, percentage });
  }

  return bins;
}

function calculateAmountForBin(binId: number, currentPrice: number, percentage: number) {
  // Calculate amount based on bin and percentage
  const baseAmount = 10000000; // 10 tokens
  return Math.floor(baseAmount * percentage);
}

function shouldPerformSwap(currentPrice: number) {
  // Logic to determine if swap should be performed
  return currentPrice > 1.05 || currentPrice < 0.95; // If price deviated by 5%
}
```

## Example 6: Batch with Retry Logic

```typescript
async function batchWithRetry(maxRetries: number = 3) {
  try {
    console.log("🔄 Batch operation with retry logic...");

    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}`);

        const transaction = new Transaction();

        // Add multiple operations
        const swapIx = await lbServices.createSwapInstruction({
          pair: poolAddress,
          user: wallet.publicKey,
          tokenIn: pool.tokenX,
          tokenOut: pool.tokenY,
          amount: BigInt(1000000),
          minOutAmount: BigInt(950000),
          isExactInput: true
        });
        transaction.add(swapIx);

        const addLiqIx = await lbServices.createAddLiquidityInstruction({
          pair: poolAddress,
          user: wallet.publicKey,
          amountX: BigInt(5000000),
          amountY: BigInt(5000000),
          binId: 100,
          slippage: 0.5
        });
        transaction.add(addLiqIx);

        // Send transaction
        const signature = await connection.sendTransaction(transaction, [wallet]);

        console.log("✅ Batch completed on attempt", attempt, ":", signature);
        return signature;

      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed:`, error.message);

        if (attempt === maxRetries) {
          throw new Error(`Batch failed after ${maxRetries} attempts`);
        }

        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

  } catch (error) {
    console.error("❌ Batch with retry failed:", error.message);
  }
}
```

## Example 7: Monitoring Batch Transactions

```typescript
async function monitorBatchTransaction(signature: string) {
  try {
    console.log("👀 Monitoring batch transaction...");

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature);
    console.log("Transaction confirmed:", confirmation.value.err ? "❌ Failed" : "✅ Success");

    if (!confirmation.value.err) {
      // Get transaction details
      const tx = await connection.getTransaction(signature);

      if (tx) {
        console.log("Transaction details:");
        console.log("- Slot:", tx.slot);
        console.log("- Fee:", tx.meta?.fee, "lamports");
        console.log("- Instructions:", tx.transaction.message.instructions.length);

        // Log any inner instructions (for complex transactions)
        if (tx.meta?.innerInstructions) {
          console.log("- Inner instructions:", tx.meta.innerInstructions.length);
        }

        // Check for errors in instruction execution
        if (tx.meta?.logMessages) {
          const errors = tx.meta.logMessages.filter(msg => msg.includes("Error"));
          if (errors.length > 0) {
            console.log("⚠️  Errors found:");
            errors.forEach(error => console.log("  -", error));
          }
        }
      }
    }

  } catch (error) {
    console.error("❌ Monitoring failed:", error.message);
  }
}
```

## Complete Working Script

```typescript
// batch-operations.ts
import {
  LiquidityBookServices,
  PublicKey,
  Keypair,
  Transaction,
  Connection
} from "@saros-finance/dlmm-sdk";

async function main() {
  const lbServices = new LiquidityBookServices({
    cluster: "mainnet-beta"
  });

  const wallet = Keypair.generate(); // Replace with your wallet
  const connection = new Connection("https://api.mainnet-beta.solana.com");

  try {
    console.log("🚀 Starting batch operations example...");

    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    // Example 1: Simple batch swaps
    console.log("Step 1: Performing batch swaps...");
    await performBatchSwaps(poolAddress, wallet, connection);

    // Example 2: Batch liquidity operations
    console.log("Step 2: Performing batch liquidity operations...");
    await performBatchLiquidity(poolAddress, wallet, connection);

    console.log("🎉 Batch operations example complete!");

  } catch (error) {
    console.error("❌ Example failed:", error.message);
    process.exit(1);
  }
}

async function performBatchSwaps(poolAddress: PublicKey, wallet: Keypair, connection: Connection) {
  const transaction = new Transaction();

  // Add two swap instructions
  const swap1 = await lbServices.createSwapInstruction({
    pair: poolAddress,
    user: wallet.publicKey,
    tokenIn: pool.tokenX,
    tokenOut: pool.tokenY,
    amount: BigInt(1000000),
    minOutAmount: BigInt(950000),
    isExactInput: true
  });
  transaction.add(swap1);

  const swap2 = await lbServices.createSwapInstruction({
    pair: poolAddress,
    user: wallet.publicKey,
    tokenIn: pool.tokenY,
    tokenOut: pool.tokenX,
    amount: BigInt(500000),
    minOutAmount: BigInt(475000),
    isExactInput: true
  });
  transaction.add(swap2);

  const signature = await connection.sendTransaction(transaction, [wallet]);
  console.log("Batch swaps signature:", signature);
}

async function performBatchLiquidity(poolAddress: PublicKey, wallet: Keypair, connection: Connection) {
  const transaction = new Transaction();

  // Add liquidity instruction
  const addLiq = await lbServices.createAddLiquidityInstruction({
    pair: poolAddress,
    user: wallet.publicKey,
    amountX: BigInt(10000000),
    amountY: BigInt(10000000),
    binId: 100,
    slippage: 0.5
  });
  transaction.add(addLiq);

  // Remove liquidity instruction
  const removeLiq = await lbServices.createRemoveLiquidityInstruction({
    pair: poolAddress,
    user: wallet.publicKey,
    amount: BigInt(1000000),
    binId: 99
  });
  transaction.add(removeLiq);

  const signature = await connection.sendTransaction(transaction, [wallet]);
  console.log("Batch liquidity signature:", signature);
}

main().catch(console.error);
```

## Running the Example

```bash
# Install dependencies
npm install @saros-finance/dlmm-sdk

# Run the example
npx ts-node batch-operations.ts
```

## Best Practices for Batch Operations

### Transaction Size Limits
- **Solana limit**: ~1.4MB per transaction
- **Instruction limit**: ~35 instructions per transaction
- **Account limit**: ~35 accounts per transaction

### Optimization Strategies
- **Group similar operations**: Combine swaps, then liquidity operations
- **Minimize account usage**: Reuse accounts where possible
- **Order instructions logically**: Dependencies first, then dependent operations

### Error Handling
- **Partial failures**: Some instructions may succeed while others fail
- **Retry logic**: Implement exponential backoff for failed transactions
- **Monitoring**: Track transaction status and individual instruction results

### Cost Optimization
- **Gas efficiency**: Fewer transactions = lower total fees
- **Priority fees**: Use appropriate priority fees for faster confirmation
- **Timing**: Batch during lower network congestion

## Common Use Cases

### Portfolio Rebalancing
- Swap multiple assets in sequence
- Add/remove liquidity across pools
- Claim fees from multiple positions

### Arbitrage Strategies
- Execute multiple swaps across different pools
- Flash loan integration for capital efficiency
- Cross-exchange arbitrage opportunities

### Liquidity Management
- Add liquidity to multiple bins simultaneously
- Rebalance positions across price ranges
- Harvest fees from multiple positions

### Complex DeFi Operations
- Multi-step yield farming strategies
- Cross-protocol interactions
- Automated trading algorithms

## Next Steps

- Learn about [Error Handling](./error-handling.md)
- Explore [Pool Analytics](./pool-analytics.md)
- Understand [Position Tracking](./position-tracking.md)

---

**Need help?** Check the [troubleshooting guide](../troubleshooting/index.md) or ask in our [Discord community](https://discord.gg/saros)!
