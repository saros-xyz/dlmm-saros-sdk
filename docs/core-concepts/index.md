# 🎯 Core Concepts

Understand DLMM in **2 minutes** with simple explanations and visual examples.

## What is DLMM?

**DLMM = Dynamic Liquidity Market Maker**

Unlike traditional AMMs that spread liquidity across all prices, DLMM concentrates liquidity in specific price ranges for **better efficiency**.

### Traditional AMM vs DLMM

```
Traditional AMM:           DLMM (Saros):
███████████████           ░░░░░░░░░░░░░░░░░░░░░░░░
██░                    ░██  ██████████░░          ░
██░░   Liquidity      ░░██  ██░░░░░░░░██░░        ░
██░░   Spread         ░░██  ██░░      ██░░        ░
██░░   Everywhere     ░░██  ██░░      ██░░        ░
██░░                  ░░██  ██░░      ██░░        ░
██░░░░░░░░░░░░░░░░░░░░░██  ██░░      ██░░        ░
███████████████████████    ██████████░░          ░
Price Range: $0.01 - $100   Price Range: $1.50 - $1.60
Efficiency: 1x              Efficiency: 1000x ⚡
```

## 🗂️ Bin System Explained

### What are Bins?

**Bins = Price buckets** where you place your liquidity.

```typescript
// Simple bin example
const bin = {
  price: "$1.50 - $1.51",    // Price range
  liquidity: "1000 USDC",    // Your tokens here
  fee: "0.01%"              // Trading fee
}
```

### Bin Step = Price Precision

```typescript
const BIN_STEPS = [
  { step: 1,   precision: "0.01%", fee: "0.001%" },  // Very precise
  { step: 10,  precision: "0.1%",  fee: "0.01%"  },  // Balanced
  { step: 100, precision: "1%",    fee: "0.1%"   }   // Wide range
];
```

## 💰 Fee Structure

### Dynamic Fees

Fees adjust based on **volatility** and **liquidity depth**:

| Volatility | Fee Rate | Use Case |
|------------|----------|----------|
| 🟢 Low | 0.01% | Stable pairs (USDC/USDT) |
| 🟡 Medium | 0.05% | Normal pairs (SOL/USDC) |
| 🔴 High | 0.2% | Volatile pairs (MEME/SOL) |

### Fee Earnings

**You earn fees** when traders use your liquidity:

```typescript
// Your position
const position = {
  liquidity: "1000 USDC",
  feeTier: "0.05%",
  dailyVolume: "10000 USDC",
  yourEarnings: "5 USDC/day"  // 0.05% of volume
};
```
Concentrates liquidity around the current price.

```typescript
import { LiquidityShape } from "@saros-finance/dlmm-sdk";

const shape = LiquidityShape.Spot; // Concentrated around spot price
```

### 2. Curve Shape
Creates a curved distribution for broader price coverage.

```typescript
const shape = LiquidityShape.Curve; // Curved distribution
```

### 3. Bid-Ask Shape
Creates separate distributions for buy and sell sides.

```typescript
const shape = LiquidityShape.BidAsk; // Bid/ask distribution
```

## Position Management

### Creating Positions

Positions represent a user's liquidity provision in specific price ranges.

```typescript
interface PositionInfo {
  pair: string;           // Pool address
  positionMint: string;   // Position NFT mint
  position: string;       // Position account address
  liquidityShares: string[]; // Shares in each bin
  lowerBinId: number;     // Lower price bound
  upperBinId: number;     // Upper price bound
}
```

### Position Lifecycle

1. **Create Position** - Initialize a new liquidity position
2. **Add Liquidity** - Deposit tokens into the position
3. **Earn Fees** - Collect trading fees automatically
4. **Remove Liquidity** - Withdraw tokens from the position
5. **Close Position** - Burn the position NFT

## Fee Structure

### Dynamic Fees

Fees adjust based on market conditions:

```typescript
interface FeeStructure {
  baseFactor: number;           // Base fee rate
  filterPeriod: number;         // Volatility measurement period
  decayPeriod: number;          // Fee decay period
  reductionFactor: number;      // Fee reduction factor
  variableFeeControl: number;   // Volatility sensitivity
  protocolShare: number;        // Protocol fee share
}
```

### Fee Distribution

- **LP Fees** - Go to liquidity providers
- **Protocol Fees** - Go to the protocol treasury
- **Host Fees** - Optional fees for integrators

## Price Discovery

### Active Bin

The active bin represents the current market price:

```typescript
const pairInfo = await lbServices.getPairAccount(poolAddress);
const currentPrice = pairInfo.activeId; // Current price bin
```

### Price Calculation

Convert bin IDs to actual prices:

```typescript
import { getPriceFromId } from "@saros-finance/dlmm-sdk/utils";

const price = getPriceFromId(binId, binStep);
```

## Swapping Mechanics

### Swap Process

1. **Quote Generation** - Calculate expected output and price impact
2. **Route Optimization** - Find the most efficient swap path
3. **Slippage Protection** - Ensure minimum output amounts
4. **Fee Calculation** - Apply appropriate fees
5. **Execution** - Perform the actual swap

### Slippage Protection

```typescript
const quote = await lbServices.getQuote({
  amount: BigInt(inputAmount),
  slippage: 0.5, // 0.5% maximum slippage
  // ... other params
});
```

## Advanced Concepts

### Bin Arrays

Liquidity is organized in bin arrays for efficient access:

```typescript
const BIN_ARRAY_SIZE = 256; // Bins per array

// Calculate bin array index
const binArrayIndex = Math.floor(binId / BIN_ARRAY_SIZE);
```

### Liquidity Shares

Each position holds shares in multiple bins:

```typescript
// Position liquidity distribution
const liquidityShares = [
  "1000000",  // Shares in bin 0
  "2000000",  // Shares in bin 1
  "1500000",  // Shares in bin 2
];
```

### Protocol Fees

Track and claim protocol fees:

```typescript
const pairInfo = await lbServices.getPairAccount(poolAddress);
console.log("Protocol fees X:", pairInfo.protocolFeesX);
console.log("Protocol fees Y:", pairInfo.protocolFeesY);
```

## Mathematical Foundations

### Bin Price Formula

```
price = (1 + binStep/10000)^binId
```

### Liquidity Calculation

```
liquidity = sqrt(reserveX * reserveY)
```

### Fee Calculation

```
fee = baseFee + variableFee * volatility
```

## Best Practices

### Position Management

1. **Monitor Positions** - Regularly check position performance
2. **Rebalance** - Adjust ranges based on market conditions
3. **Claim Fees** - Harvest accumulated fees regularly
4. **Risk Management** - Use appropriate position sizes

### Swap Optimization

1. **Use Quotes** - Always get quotes before swapping
2. **Set Slippage** - Protect against price movements
3. **Batch Transactions** - Combine multiple operations
4. **Monitor Gas** - Optimize for Solana fees

### Security Considerations

1. **Validate Inputs** - Check all parameters before execution
2. **Use Timeouts** - Set transaction timeouts
3. **Monitor Balances** - Track token balances
4. **Handle Errors** - Implement proper error handling

## Integration Patterns

### Wallet Integration

```typescript
// With wallet adapter
const { publicKey, signTransaction } = useWallet();

const signedTx = await signTransaction(swapTx);
```

### React Integration

```typescript
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

function SwapComponent() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  // Component logic here
}
```

### Backend Integration

```typescript
// Server-side operations
const lbServices = new LiquidityBookServices({
  mode: MODE.MAINNET
});

// Automated operations
setInterval(async () => {
  await rebalancePositions();
  await claimFees();
}, 3600000); // Every hour
```

## Troubleshooting

### Common Issues

1. **Insufficient Liquidity** - Check pool liquidity before swapping
2. **Price Impact** - Large swaps may have high price impact
3. **Network Congestion** - Monitor Solana network status
4. **Token Decimals** - Ensure correct decimal handling

### Monitoring

```typescript
// Monitor pool health
const poolInfo = await lbServices.getPairAccount(poolAddress);
const binArrays = await lbServices.getBinArrayInfo({
  binArrayIndex: Math.floor(poolInfo.activeId / 256),
  pair: poolAddress
});
```

## Next Steps

- **[API Reference](../api-reference/index.md)** - Complete method documentation
- **[Guides](../guides/index.md)** - Step-by-step tutorials
- **[Examples](../examples/index.md)** - Working code samples

---

**Ready to build? Check out our [Getting Started](../getting-started/) guide!**</content>
<parameter name="filePath">h:\Rahul Prasad 01\earn\Saros\docs\core-concepts\index.md
