# Position Tracking Example

Complete guide for tracking and monitoring your liquidity positions on Saros DLMM.

## Overview

Position tracking is essential for liquidity providers to monitor their investments, earnings, and manage their portfolio effectively.

## Prerequisites

- Node.js 16+
- npm or yarn
- Active liquidity positions
- Understanding of position metrics

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

## Example 1: Get All User Positions

```typescript
async function getAllPositions() {
  try {
    console.log("📊 Getting all positions...");

    const positions = await lbServices.getUserPositions(wallet.publicKey);

    console.log(`Found ${positions.length} positions:`);

    for (const position of positions) {
      console.log("---");
      console.log("Position:", position.address.toString());
      console.log("Pool:", position.pair.toString());
      console.log("Bin ID:", position.binId);
      console.log("Liquidity:", position.liquidity);
      console.log("Token X:", position.amountX);
      console.log("Token Y:", position.amountY);
      console.log("Fees earned:", position.feeEarnings);
    }

  } catch (error) {
    console.error("❌ Get positions failed:", error.message);
  }
}
```

## Example 2: Track Single Position

```typescript
async function trackPosition(positionAddress: PublicKey) {
  try {
    console.log("📈 Tracking position:", positionAddress.toString());

    const position = await lbServices.getPositionInfo(positionAddress);

    console.log("Position Details:");
    console.log("- Status:", position.isActive ? "Active" : "Inactive");
    console.log("- Bin ID:", position.binId);
    console.log("- Liquidity:", position.liquidity);
    console.log("- Token X amount:", position.amountX);
    console.log("- Token Y amount:", position.amountY);
    console.log("- Fees earned:", position.feeEarnings);
    console.log("- Last updated:", position.lastUpdate);

    // Calculate metrics
    const totalValue = position.amountX + position.amountY;
    const feeYield = (position.feeEarnings / totalValue) * 100;

    console.log("Metrics:");
    console.log("- Total value:", totalValue);
    console.log("- Fee yield:", feeYield.toFixed(2) + "%");

  } catch (error) {
    console.error("❌ Track position failed:", error.message);
  }
}
```

## Example 3: Monitor Position Performance

```typescript
async function monitorPerformance(positionAddress: PublicKey) {
  try {
    console.log("📊 Monitoring position performance...");

    // Get initial state
    const initial = await lbServices.getPositionInfo(positionAddress);
    const startTime = Date.now();

    // Monitor for 1 hour (in production, use a proper scheduler)
    const monitorInterval = setInterval(async () => {
      try {
        const current = await lbServices.getPositionInfo(positionAddress);
        const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes

        // Calculate performance metrics
        const feeGrowth = current.feeEarnings - initial.feeEarnings;
        const feeRate = (feeGrowth / initial.liquidity) * 100;
        const hourlyRate = feeRate / (elapsed / 60);

        console.log(`[${elapsed.toFixed(1)}min] Performance:`);
        console.log(`- Fee earnings: ${feeGrowth}`);
        console.log(`- Fee rate: ${feeRate.toFixed(4)}%`);
        console.log(`- Hourly rate: ${hourlyRate.toFixed(4)}%/hr`);

        // Stop after 1 hour
        if (elapsed >= 60) {
          clearInterval(monitorInterval);
          console.log("✅ Monitoring complete");
        }

      } catch (error) {
        console.error("❌ Monitoring error:", error.message);
        clearInterval(monitorInterval);
      }
    }, 300000); // Check every 5 minutes

  } catch (error) {
    console.error("❌ Monitor performance failed:", error.message);
  }
}
```

## Example 4: Position Health Check

```typescript
async function checkPositionHealth(positionAddress: PublicKey) {
  try {
    console.log("🏥 Checking position health...");

    const position = await lbServices.getPositionInfo(positionAddress);
    const pool = await lbServices.getPairAccount(position.pair);

    // Health metrics
    const health = {
      isActive: position.isActive,
      hasLiquidity: position.liquidity > 0,
      inRange: position.binId >= pool.activeBinId - 10 && position.binId <= pool.activeBinId + 10,
      feeYield: (position.feeEarnings / position.liquidity) * 100,
      impermanentLoss: calculateImpermanentLoss(position, pool)
    };

    console.log("Health Report:");
    console.log("- Active:", health.isActive ? "✅" : "❌");
    console.log("- Has liquidity:", health.hasLiquidity ? "✅" : "❌");
    console.log("- In range:", health.inRange ? "✅" : "❌");
    console.log("- Fee yield:", health.feeYield.toFixed(2) + "%");
    console.log("- IL risk:", health.impermanentLoss > 0.05 ? "🔴 High" : "🟢 Low");

    // Recommendations
    if (!health.inRange) {
      console.log("💡 Recommendation: Consider rebalancing position");
    }
    if (health.feeYield < 0.01) {
      console.log("💡 Recommendation: Consider removing liquidity if yield is too low");
    }

    return health;

  } catch (error) {
    console.error("❌ Health check failed:", error.message);
  }
}

function calculateImpermanentLoss(position: any, pool: any) {
  // Simplified IL calculation
  const currentRatio = pool.price;
  const initialRatio = position.initialPrice || pool.price;
  const ratio = Math.sqrt(currentRatio / initialRatio);

  return 2 * Math.sqrt(ratio) / (1 + ratio) - 1;
}
```

## Example 5: Portfolio Overview

```typescript
async function portfolioOverview() {
  try {
    console.log("📊 Portfolio Overview");

    const positions = await lbServices.getUserPositions(wallet.publicKey);

    let totalLiquidity = 0;
    let totalFees = 0;
    let totalValue = 0;

    console.log(`Found ${positions.length} positions:\n`);

    for (const position of positions) {
      const pool = await lbServices.getPairAccount(position.pair);
      const value = position.amountX + position.amountY;

      console.log(`Position: ${position.address.toString().slice(0, 8)}...`);
      console.log(`- Pool: ${pool.name || 'Unknown'}`);
      console.log(`- Value: ${value}`);
      console.log(`- Fees: ${position.feeEarnings}`);
      console.log(`- Yield: ${((position.feeEarnings / value) * 100).toFixed(2)}%\n`);

      totalLiquidity += position.liquidity;
      totalFees += position.feeEarnings;
      totalValue += value;
    }

    console.log("Portfolio Summary:");
    console.log("- Total positions:", positions.length);
    console.log("- Total value:", totalValue);
    console.log("- Total fees earned:", totalFees);
    console.log("- Average yield:", ((totalFees / totalValue) * 100).toFixed(2) + "%");

  } catch (error) {
    console.error("❌ Portfolio overview failed:", error.message);
  }
}
```

## Example 6: Automated Rebalancing

```typescript
async function autoRebalance(positionAddress: PublicKey) {
  try {
    console.log("🔄 Auto-rebalancing position...");

    const position = await lbServices.getPositionInfo(positionAddress);
    const pool = await lbServices.getPairAccount(position.pair);

    // Check if position is out of range
    const range = 5; // bins
    const isOutOfRange = Math.abs(position.binId - pool.activeBinId) > range;

    if (isOutOfRange) {
      console.log("Position is out of range, rebalancing...");

      // Remove from old position
      await lbServices.removeLiquidity({
        position: positionAddress,
        user: wallet.publicKey,
        binId: position.binId,
        amountX: position.amountX,
        amountY: position.amountY,
        slippage: 1.0
      });

      // Add to new optimal position
      const newBinId = pool.activeBinId;
      await lbServices.addLiquidity({
        pair: position.pair,
        user: wallet.publicKey,
        binId: newBinId,
        amountX: position.amountX,
        amountY: position.amountY,
        slippage: 1.0
      });

      console.log(`✅ Rebalanced from bin ${position.binId} to ${newBinId}`);

    } else {
      console.log("Position is in range, no rebalancing needed");
    }

  } catch (error) {
    console.error("❌ Auto-rebalance failed:", error.message);
  }
}
```

## Example 7: Export Position Data

```typescript
async function exportPositions() {
  try {
    console.log("📤 Exporting position data...");

    const positions = await lbServices.getUserPositions(wallet.publicKey);
    const exportData = [];

    for (const position of positions) {
      const pool = await lbServices.getPairAccount(position.pair);

      exportData.push({
        address: position.address.toString(),
        pool: position.pair.toString(),
        binId: position.binId,
        liquidity: position.liquidity,
        amountX: position.amountX,
        amountY: position.amountY,
        feeEarnings: position.feeEarnings,
        poolPrice: pool.price,
        timestamp: new Date().toISOString()
      });
    }

    // Save to JSON file
    const fs = require('fs');
    fs.writeFileSync('positions.json', JSON.stringify(exportData, null, 2));

    console.log("✅ Position data exported to positions.json");

  } catch (error) {
    console.error("❌ Export failed:", error.message);
  }
}
```

## Complete Working Script

```typescript
// position-tracking.ts
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
    console.log("🚀 Starting position tracking example...");

    // Get all positions
    console.log("Step 1: Getting all positions...");
    const positions = await lbServices.getUserPositions(wallet.publicKey);
    console.log(`Found ${positions.length} positions`);

    if (positions.length > 0) {
      // Track first position
      console.log("Step 2: Tracking first position...");
      await trackPosition(positions[0].address);

      // Health check
      console.log("Step 3: Health check...");
      await checkPositionHealth(positions[0].address);
    }

    console.log("🎉 Position tracking example complete!");

  } catch (error) {
    console.error("❌ Example failed:", error.message);
    process.exit(1);
  }
}

async function trackPosition(positionAddress: PublicKey) {
  const position = await lbServices.getPositionInfo(positionAddress);
  console.log("Position tracked:", {
    binId: position.binId,
    liquidity: position.liquidity,
    fees: position.feeEarnings
  });
}

async function checkPositionHealth(positionAddress: PublicKey) {
  const position = await lbServices.getPositionInfo(positionAddress);
  const isHealthy = position.liquidity > 0 && position.isActive;
  console.log("Position health:", isHealthy ? "✅ Good" : "❌ Needs attention");
}

main().catch(console.error);
```

## Running the Example

```bash
# Install dependencies
npm install @saros-finance/dlmm-sdk

# Run the example
npx ts-node position-tracking.ts
```

## Key Metrics to Monitor

### Performance Metrics
- **Fee Yield**: Fees earned vs liquidity provided
- **Impermanent Loss**: Price divergence impact
- **Range Efficiency**: How often position is in range

### Risk Metrics
- **Out of Range**: Position outside optimal price range
- **Liquidity Depth**: Pool liquidity vs your position
- **Volatility**: Price stability of the pair

### Health Metrics
- **Active Status**: Position still earning fees
- **Fee Accumulation**: Regular fee earnings
- **Rebalancing Needs**: When to adjust position

## Best Practices

### Monitoring Frequency
- **Daily**: Check fee earnings and health
- **Weekly**: Review performance metrics
- **Monthly**: Assess rebalancing needs

### Alert Thresholds
- **Fee yield < 0.01%**: Consider removing liquidity
- **Out of range > 20%**: Rebalance position
- **IL > 5%**: Evaluate risk tolerance

### Record Keeping
- **Export data**: Regular position snapshots
- **Track changes**: Position adjustments over time
- **Performance logs**: Fee earnings history

## Next Steps

- Learn about [Pool Analytics](./pool-analytics.md)
- Explore [Batch Operations](./batch-operations.md)
- Understand [Error Handling](./error-handling.md)

---

**Need help?** Check the [troubleshooting guide](../troubleshooting/index.md) or ask in our [Discord community](https://discord.gg/saros)!
