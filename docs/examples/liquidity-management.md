# Liquidity Management Example

Complete guide for adding and removing liquidity from Saros DLMM pools.

## Overview

Liquidity providers (LPs) earn fees by providing tokens to trading pools. This example shows how to add and remove liquidity safely.

## Prerequisites

- Node.js 16+
- npm or yarn
- SOL and tokens for liquidity
- Understanding of impermanent loss

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

// Your wallet
const wallet = Keypair.generate(); // Replace with your wallet
```

## Example 1: Add Liquidity

```typescript
async function addLiquidity() {
  try {
    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    console.log("💰 Adding liquidity...");

    // Add liquidity to bin ID 100
    const result = await lbServices.addLiquidity({
      pair: poolAddress,
      user: wallet.publicKey,
      binId: 100, // Target price bin
      amountX: 1000000, // 1 C98
      amountY: 1000000, // 1 USDC
      slippage: 0.5
    });

    console.log("✅ Liquidity added!");
    console.log("Transaction:", result.signature);
    console.log("Position created at bin:", 100);

  } catch (error) {
    console.error("❌ Add liquidity failed:", error.message);
  }
}
```

## Example 2: Remove Liquidity

```typescript
async function removeLiquidity() {
  try {
    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");
    const positionAddress = new PublicKey("YOUR_POSITION_ADDRESS"); // From addLiquidity result

    console.log("💸 Removing liquidity...");

    // Remove liquidity from position
    const result = await lbServices.removeLiquidity({
      position: positionAddress,
      user: wallet.publicKey,
      binId: 100,
      amountX: 500000, // Remove 0.5 C98
      amountY: 500000, // Remove 0.5 USDC
      slippage: 0.5
    });

    console.log("✅ Liquidity removed!");
    console.log("Transaction:", result.signature);

  } catch (error) {
    console.error("❌ Remove liquidity failed:", error.message);
  }
}
```

## Example 3: Get Position Info

```typescript
async function getPositionInfo() {
  try {
    const positionAddress = new PublicKey("YOUR_POSITION_ADDRESS");

    console.log("📊 Getting position info...");

    const position = await lbServices.getPositionInfo(positionAddress);

    console.log("Position Details:");
    console.log("- Liquidity:", position.liquidity);
    console.log("- Fee earnings:", position.feeEarnings);
    console.log("- Token X amount:", position.amountX);
    console.log("- Token Y amount:", position.amountY);
    console.log("- Bin ID:", position.binId);

  } catch (error) {
    console.error("❌ Get position failed:", error.message);
  }
}
```

## Example 4: Claim Fees

```typescript
async function claimFees() {
  try {
    const positionAddress = new PublicKey("YOUR_POSITION_ADDRESS");

    console.log("💰 Claiming fees...");

    // Claim accumulated fees
    const result = await lbServices.claimFees({
      position: positionAddress,
      user: wallet.publicKey
    });

    console.log("✅ Fees claimed!");
    console.log("Transaction:", result.signature);

  } catch (error) {
    console.error("❌ Claim fees failed:", error.message);
  }
}
```

## Example 5: Calculate Optimal Bin

```typescript
async function findOptimalBin() {
  try {
    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    // Get current price
    const pool = await lbServices.getPairAccount(poolAddress);
    const currentPrice = pool.price;

    console.log("Current price:", currentPrice);

    // Calculate optimal bin for price range
    const minPrice = currentPrice * 0.95; // 5% below current
    const maxPrice = currentPrice * 1.05; // 5% above current

    // Convert prices to bin IDs
    const minBin = priceToBinId(minPrice, 10, pool.minPrice, pool.maxPrice);
    const maxBin = priceToBinId(maxPrice, 10, pool.minPrice, pool.maxPrice);

    console.log("Optimal bin range:", minBin, "to", maxBin);

    return { minBin, maxBin };

  } catch (error) {
    console.error("❌ Calculate optimal bin failed:", error.message);
  }
}
```

## Example 6: Batch Liquidity Operations

```typescript
async function batchLiquidityOps() {
  try {
    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    console.log("🔄 Batch liquidity operations...");

    // Add liquidity to multiple bins
    const operations = [
      { binId: 95, amountX: 1000000, amountY: 1000000 },
      { binId: 100, amountX: 1000000, amountY: 1000000 },
      { binId: 105, amountX: 1000000, amountY: 1000000 }
    ];

    for (const op of operations) {
      const result = await lbServices.addLiquidity({
        pair: poolAddress,
        user: wallet.publicKey,
        binId: op.binId,
        amountX: op.amountX,
        amountY: op.amountY,
        slippage: 0.5
      });

      console.log(`✅ Added to bin ${op.binId}:`, result.signature);
    }

  } catch (error) {
    console.error("❌ Batch operation failed:", error.message);
  }
}
```

## Example 7: Emergency Remove All

```typescript
async function emergencyRemoveAll() {
  try {
    const positionAddress = new PublicKey("YOUR_POSITION_ADDRESS");

    console.log("🚨 Emergency removing all liquidity...");

    // Get position info first
    const position = await lbServices.getPositionInfo(positionAddress);

    // Remove all liquidity
    const result = await lbServices.removeLiquidity({
      position: positionAddress,
      user: wallet.publicKey,
      binId: position.binId,
      amountX: position.amountX, // Remove all
      amountY: position.amountY, // Remove all
      slippage: 2.0 // Higher slippage for emergency
    });

    console.log("✅ Emergency removal complete!");
    console.log("Transaction:", result.signature);

  } catch (error) {
    console.error("❌ Emergency removal failed:", error.message);
  }
}
```

## Complete Working Script

```typescript
// liquidity-management.ts
import {
  LiquidityBookServices,
  PublicKey,
  Keypair
} from "@saros-finance/dlmm-sdk";

async function main() {
  const lbServices = new LiquidityBookServices({
    cluster: "mainnet-beta"
  });

  const wallet = Keypair.generate(); // Replace with your wallet

  try {
    console.log("🚀 Starting liquidity management example...");

    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    // Add liquidity
    console.log("Step 1: Adding liquidity...");
    const addResult = await lbServices.addLiquidity({
      pair: poolAddress,
      user: wallet.publicKey,
      binId: 100,
      amountX: 1000000,
      amountY: 1000000,
      slippage: 0.5
    });

    console.log("✅ Liquidity added:", addResult.signature);

    // Wait a bit for position to be created
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get position info (you'd need the actual position address)
    console.log("Step 2: Getting position info...");
    // const position = await lbServices.getPositionInfo(addResult.positionAddress);
    // console.log("Position created:", position);

    console.log("🎉 Liquidity management example complete!");

  } catch (error) {
    console.error("❌ Example failed:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);
```

## Running the Example

```bash
# Install dependencies
npm install @saros-finance/dlmm-sdk

# Run the example
npx ts-node liquidity-management.ts
```

## Important Notes

### Impermanent Loss
- **What it is**: Loss when token prices change after providing liquidity
- **When it happens**: When token ratio changes significantly
- **Mitigation**: Provide liquidity in stable pairs, use narrow ranges

### Fee Earnings
- **How it works**: You earn a portion of trading fees
- **Claiming**: Fees accumulate automatically, claim when you want
- **Timing**: Claim regularly to compound earnings

### Bin Selection
- **Narrow bins**: Higher fees, higher risk
- **Wide bins**: Lower fees, lower risk
- **Current price**: Usually best for most LPs

## Risk Management

```typescript
// Safe liquidity provision
async function safeAddLiquidity(params: AddLiquidityParams) {
  try {
    // Check balances
    const tokenXBalance = await getTokenBalance(params.tokenX, params.user);
    const tokenYBalance = await getTokenBalance(params.tokenY, params.user);

    if (tokenXBalance < params.amountX || tokenYBalance < params.amountY) {
      throw new Error("Insufficient token balance");
    }

    // Check pool health
    const pool = await lbServices.getPairAccount(params.pair);
    if (pool.liquidity < MIN_POOL_LIQUIDITY) {
      throw new Error("Pool has insufficient liquidity");
    }

    // Add with reasonable slippage
    const result = await lbServices.addLiquidity({
      ...params,
      slippage: Math.min(params.slippage || 0.5, 1.0) // Max 1%
    });

    return result;

  } catch (error) {
    console.error("Safe add liquidity failed:", error.message);
    throw error;
  }
}
```

## Next Steps

- Learn about [Position Tracking](./position-tracking.md)
- Explore [Pool Analytics](./pool-analytics.md)
- Understand [Error Handling](./error-handling.md)

---

**Need help?** Check the [troubleshooting guide](../troubleshooting/index.md) or ask in our [Discord community](https://discord.gg/saros)!
