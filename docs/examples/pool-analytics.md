# Pool Analytics Example

Complete guide for analyzing and monitoring Saros DLMM pool performance and statistics.

## Overview

Pool analytics help you understand market trends, trading volume, liquidity distribution, and make informed decisions about providing liquidity.

## Prerequisites

- Node.js 16+
- npm or yarn
- Understanding of DeFi metrics

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

## Example 1: Basic Pool Info

```typescript
async function getPoolInfo() {
  try {
    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    console.log("📊 Getting pool information...");

    const pool = await lbServices.getPairAccount(poolAddress);

    console.log("Pool Details:");
    console.log("- Address:", poolAddress.toString());
    console.log("- Token X:", pool.tokenX.toString());
    console.log("- Token Y:", pool.tokenY.toString());
    console.log("- Current price:", pool.price);
    console.log("- Total liquidity:", pool.totalLiquidity);
    console.log("- Active bin:", pool.activeBinId);
    console.log("- Bin step:", pool.binStep);
    console.log("- Status:", pool.isActive ? "Active" : "Inactive");

  } catch (error) {
    console.error("❌ Get pool info failed:", error.message);
  }
}
```

## Example 2: Volume Analytics

```typescript
async function getVolumeAnalytics(poolAddress: PublicKey) {
  try {
    console.log("📈 Analyzing trading volume...");

    const pool = await lbServices.getPairAccount(poolAddress);

    // Get volume data (would need historical data in production)
    const volume24h = pool.volume24h || 0;
    const volume7d = pool.volume7d || 0;
    const fees24h = pool.fee24h || 0;

    console.log("Volume Analytics:");
    console.log("- 24h volume:", volume24h);
    console.log("- 7d volume:", volume7d);
    console.log("- 24h fees:", fees24h);
    console.log("- Fee/APR:", ((fees24h * 365 / pool.totalLiquidity) * 100).toFixed(2) + "%");

    // Volume trends
    const dailyChange = volume24h > 0 ? ((volume24h - (volume7d / 7)) / (volume7d / 7)) * 100 : 0;
    console.log("- Daily change:", dailyChange.toFixed(2) + "%");

  } catch (error) {
    console.error("❌ Volume analytics failed:", error.message);
  }
}
```

## Example 3: Liquidity Distribution

```typescript
async function analyzeLiquidityDistribution(poolAddress: PublicKey) {
  try {
    console.log("🌊 Analyzing liquidity distribution...");

    const pool = await lbServices.getPairAccount(poolAddress);

    // Get bin data (simplified - would need full bin array in production)
    const bins = pool.binArray || [];
    let totalLiquidity = 0;
    let activeBins = 0;

    for (const bin of bins) {
      totalLiquidity += bin.liquidity;
      if (bin.liquidity > 0) activeBins++;
    }

    console.log("Liquidity Distribution:");
    console.log("- Total bins:", bins.length);
    console.log("- Active bins:", activeBins);
    console.log("- Total liquidity:", totalLiquidity);
    console.log("- Average per bin:", totalLiquidity / activeBins);

    // Concentration analysis
    const topBins = bins
      .filter(bin => bin.liquidity > 0)
      .sort((a, b) => b.liquidity - a.liquidity)
      .slice(0, 5);

    console.log("Top 5 bins by liquidity:");
    topBins.forEach((bin, index) => {
      const percentage = (bin.liquidity / totalLiquidity) * 100;
      console.log(`${index + 1}. Bin ${bin.binId}: ${percentage.toFixed(1)}%`);
    });

  } catch (error) {
    console.error("❌ Liquidity analysis failed:", error.message);
  }
}
```

## Example 4: Price Impact Analysis

```typescript
async function analyzePriceImpact(poolAddress: PublicKey) {
  try {
    console.log("🎯 Analyzing price impact...");

    const pool = await lbServices.getPairAccount(poolAddress);

    // Test different trade sizes
    const tradeSizes = [1000, 10000, 100000, 1000000]; // Different amounts

    console.log("Price Impact Analysis:");
    console.log("Trade Size | Price Impact | Slippage");
    console.log("-----------|--------------|----------");

    for (const size of tradeSizes) {
      try {
        const quote = await lbServices.getQuote({
          amount: BigInt(size),
          isExactInput: true,
          swapForY: true,
          pair: poolAddress,
          tokenBase: pool.tokenX,
          tokenQuote: pool.tokenY,
          tokenBaseDecimal: 6,
          tokenQuoteDecimal: 6,
          slippage: 0.5
        });

        const impact = quote.priceImpact || 0;
        const slippage = (impact * 100).toFixed(2) + "%";

        console.log(`${size.toLocaleString()} | ${impact.toFixed(4)} | ${slippage}`);

      } catch (error) {
        console.log(`${size.toLocaleString()} | Error | N/A`);
      }
    }

  } catch (error) {
    console.error("❌ Price impact analysis failed:", error.message);
  }
}
```

## Example 5: Pool Health Metrics

```typescript
async function checkPoolHealth(poolAddress: PublicKey) {
  try {
    console.log("🏥 Checking pool health...");

    const pool = await lbServices.getPairAccount(poolAddress);

    // Health metrics
    const health = {
      isActive: pool.isActive,
      hasLiquidity: pool.totalLiquidity > 1000000, // At least 1 token
      hasVolume: (pool.volume24h || 0) > 100000, // At least some volume
      priceStability: calculatePriceStability(pool),
      liquidityConcentration: calculateLiquidityConcentration(pool),
      impermanentLoss: estimateImpermanentLoss(pool)
    };

    console.log("Pool Health Report:");
    console.log("- Active:", health.isActive ? "✅" : "❌");
    console.log("- Sufficient liquidity:", health.hasLiquidity ? "✅" : "❌");
    console.log("- Trading volume:", health.hasVolume ? "✅" : "❌");
    console.log("- Price stability:", health.priceStability > 0.8 ? "🟢 Good" : "🟡 Poor");
    console.log("- Liquidity concentration:", health.liquidityConcentration < 0.3 ? "🟢 Good" : "🟡 Concentrated");

    // Overall score
    const score = Object.values(health).filter(Boolean).length / Object.keys(health).length;
    console.log("- Overall health:", (score * 100).toFixed(0) + "%");

    return health;

  } catch (error) {
    console.error("❌ Pool health check failed:", error.message);
  }
}

function calculatePriceStability(pool: any) {
  // Simplified stability calculation
  const recentPrices = pool.priceHistory || [pool.price];
  const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / recentPrices.length;
  const stability = 1 / (1 + Math.sqrt(variance) / avgPrice);

  return stability;
}

function calculateLiquidityConcentration(pool: any) {
  // Measure how concentrated liquidity is
  const bins = pool.binArray || [];
  const totalLiquidity = bins.reduce((sum, bin) => sum + bin.liquidity, 0);
  const topBinLiquidity = Math.max(...bins.map(bin => bin.liquidity));

  return topBinLiquidity / totalLiquidity;
}

function estimateImpermanentLoss(pool: any) {
  // Simplified IL estimation
  const priceChange = pool.priceChange24h || 0;
  const il = Math.abs(priceChange) > 0 ? (2 * Math.sqrt(Math.abs(priceChange))) / (1 + Math.abs(priceChange)) : 0;

  return il;
}
```

## Example 6: Compare Multiple Pools

```typescript
async function comparePools(poolAddresses: PublicKey[]) {
  try {
    console.log("🔍 Comparing pools...");

    const pools = [];

    for (const address of poolAddresses) {
      try {
        const pool = await lbServices.getPairAccount(address);
        pools.push({
          address: address.toString(),
          price: pool.price,
          liquidity: pool.totalLiquidity,
          volume24h: pool.volume24h || 0,
          fee24h: pool.fee24h || 0
        });
      } catch (error) {
        console.log(`Failed to get pool ${address.toString()}:`, error.message);
      }
    }

    // Sort by volume
    pools.sort((a, b) => b.volume24h - a.volume24h);

    console.log("Pool Comparison (sorted by volume):");
    console.log("Address | Price | Liquidity | Volume 24h | Fee 24h");
    console.log("--------|-------|-----------|------------|---------");

    pools.forEach(pool => {
      console.log(
        `${pool.address.slice(0, 8)}... | ` +
        `${pool.price.toFixed(4)} | ` +
        `${pool.liquidity.toLocaleString()} | ` +
        `${pool.volume24h.toLocaleString()} | ` +
        `${pool.fee24h.toFixed(2)}`
      );
    });

  } catch (error) {
    console.error("❌ Pool comparison failed:", error.message);
  }
}
```

## Example 7: Historical Performance

```typescript
async function getHistoricalPerformance(poolAddress: PublicKey, days: number = 7) {
  try {
    console.log(`📈 Getting ${days}-day performance...`);

    const pool = await lbServices.getPairAccount(poolAddress);

    // In production, you'd fetch historical data from an API
    // This is a simplified example
    const performance = {
      priceChange: pool.priceChange24h || 0,
      volumeChange: pool.volumeChange24h || 0,
      liquidityChange: pool.liquidityChange24h || 0,
      feeChange: pool.feeChange24h || 0
    };

    console.log("Historical Performance:");
    console.log("- Price change:", (performance.priceChange * 100).toFixed(2) + "%");
    console.log("- Volume change:", (performance.volumeChange * 100).toFixed(2) + "%");
    console.log("- Liquidity change:", (performance.liquidityChange * 100).toFixed(2) + "%");
    console.log("- Fee change:", (performance.feeChange * 100).toFixed(2) + "%");

    // Trend analysis
    const trends = {
      price: performance.priceChange > 0 ? "📈 Up" : "📉 Down",
      volume: performance.volumeChange > 0 ? "📈 Up" : "📉 Down",
      liquidity: performance.liquidityChange > 0 ? "📈 Up" : "📉 Down"
    };

    console.log("Trends:");
    console.log("- Price:", trends.price);
    console.log("- Volume:", trends.volume);
    console.log("- Liquidity:", trends.liquidity);

  } catch (error) {
    console.error("❌ Historical performance failed:", error.message);
  }
}
```

## Complete Working Script

```typescript
// pool-analytics.ts
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
    console.log("🚀 Starting pool analytics example...");

    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    // Basic pool info
    console.log("Step 1: Getting pool info...");
    await getPoolInfo();

    // Volume analytics
    console.log("Step 2: Analyzing volume...");
    await getVolumeAnalytics(poolAddress);

    // Health check
    console.log("Step 3: Checking pool health...");
    await checkPoolHealth(poolAddress);

    console.log("🎉 Pool analytics example complete!");

  } catch (error) {
    console.error("❌ Example failed:", error.message);
    process.exit(1);
  }
}

async function getPoolInfo() {
  const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");
  const pool = await lbServices.getPairAccount(poolAddress);

  console.log("Pool info:", {
    price: pool.price,
    liquidity: pool.totalLiquidity,
    activeBin: pool.activeBinId
  });
}

async function getVolumeAnalytics(poolAddress: PublicKey) {
  const pool = await lbServices.getPairAccount(poolAddress);
  const volume24h = pool.volume24h || 0;

  console.log("24h volume:", volume24h);
}

async function checkPoolHealth(poolAddress: PublicKey) {
  const pool = await lbServices.getPairAccount(poolAddress);
  const isHealthy = pool.isActive && pool.totalLiquidity > 0;

  console.log("Pool health:", isHealthy ? "✅ Good" : "❌ Poor");
}

main().catch(console.error);
```

## Running the Example

```bash
# Install dependencies
npm install @saros-finance/dlmm-sdk

# Run the example
npx ts-node pool-analytics.ts
```

## Key Metrics to Track

### Liquidity Metrics
- **Total Liquidity**: Total value locked in pool
- **Active Bins**: Number of bins with liquidity
- **Concentration**: How spread out liquidity is
- **Depth**: Liquidity available at current price

### Volume Metrics
- **24h Volume**: Trading volume in last 24 hours
- **Volume Trend**: How volume is changing
- **Fee Revenue**: Fees generated from trading
- **Fee/APR**: Annual percentage return for LPs

### Price Metrics
- **Current Price**: Spot price of the pair
- **Price Impact**: How much price moves with trades
- **Volatility**: Price stability over time
- **Range**: Price range with active liquidity

### Health Metrics
- **Active Status**: Pool is operational
- **Liquidity Health**: Sufficient liquidity available
- **Volume Health**: Sufficient trading activity
- **Impermanent Loss**: Risk for liquidity providers

## Best Practices

### Monitoring Frequency
- **Real-time**: Price and active bin
- **Hourly**: Volume and liquidity changes
- **Daily**: Performance metrics and health checks
- **Weekly**: Trend analysis and rebalancing decisions

### Alert Thresholds
- **Volume drop > 50%**: Investigate market conditions
- **Liquidity drop > 30%**: Consider adding liquidity
- **Price impact > 1%**: High slippage warning
- **Health score < 70%**: Pool may need attention

### Data Sources
- **On-chain**: Direct pool data from blockchain
- **Historical**: Past performance and trends
- **Market**: Broader market conditions
- **Social**: Community sentiment and news

## Next Steps

- Learn about [Batch Operations](./batch-operations.md)
- Explore [Error Handling](./error-handling.md)
- Understand [Liquidity Management](./liquidity-management.md)

---

**Need help?** Check the [troubleshooting guide](../troubleshooting/index.md) or ask in our [Discord community](https://discord.gg/saros)!
