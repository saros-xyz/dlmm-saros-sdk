# ❓ FAQ

**Quick answers** to common Saros DLMM questions.

##  Getting Started

### How do I install the SDK?
```bash
npm install @saros-finance/dlmm-sdk
```

### Which networks are supported?
- ✅ **Mainnet Beta** - Production
- ✅ **Devnet** - Testing
- ✅ **Testnet** - Advanced testing
- ✅ **Localnet** - Development

### Do I need SOL to use it?
**Yes, for:**
- Transaction fees (~0.000005 SOL)
- Token account creation (~0.002 SOL)
- Priority fees (optional, for faster processing)

**Minimum recommended:** 0.01 SOL

## 💱 Swapping

### How do I swap tokens?
```typescript
const result = await lbServices.swap({
  pair: poolAddress,
  amount: 1000000, // 1 token (6 decimals)
  slippage: 0.5,   // 0.5% max slippage
  payer: wallet.publicKey
});
```

### What is slippage?
**Slippage** = Maximum price change you're willing to accept.

- `0.1` = 0.1% (very strict)
- `0.5` = 0.5% (balanced)
- `2.0` = 2.0% (tolerant)

### Should I get a quote first?
**Yes! Always get quote before swapping:**
```typescript
const quote = await lbServices.getQuote(params);
console.log("Expected output:", quote.amountOut);
console.log("Price impact:", quote.priceImpact);
```

// Moderate
const result = await lbServices.swap({
  // ... other params
  slippage: 0.5 // 0.5% - balanced
});

// Aggressive (higher risk)
const result = await lbServices.swap({
  // ... other params
  slippage: 2.0 // 2.0% - loose
});
```

### How do I estimate swap results?

```typescript
// Get swap quote
const quote = await lbServices.getSwapQuote({
  pair: poolAddress,
  amount: swapAmount,
  swapForY: true, // true = X to Y, false = Y to X
  binArraysPubkey: binArraysPubkey
});

console.log("Quote:", {
  amountIn: quote.amountIn,
  amountOut: quote.amountOut,
  fee: quote.fee,
  priceImpact: quote.priceImpact
});
```

## 💰 Liquidity Provision

### How do I add liquidity?

```typescript
// Add liquidity to a specific bin
const result = await lbServices.addLiquidity({
  pair: poolAddress,
  user: wallet.publicKey,
  binId: 100, // Target bin ID
  amountX: 1000000, // Amount of token X
  amountY: 1000000, // Amount of token Y
  slippage: 0.5
});
```

### What are bins and how do they work?

**Bins** are discrete price ranges where liquidity is concentrated:

- **Bin ID**: Represents a specific price level
- **Bin Step**: Price increment between bins (e.g., 0.1%, 0.5%, 1%)
- **Active Bins**: Bins with liquidity available for trading
- **Position**: Your liquidity in specific bins

### How do I calculate bin IDs from prices?

```typescript
import { priceToBinId } from "@saros-finance/dlmm-sdk";

// Convert price to bin ID
const binId = priceToBinId(
  currentPrice,    // Current market price
  binStep,         // Bin step (e.g., 100 = 1%)
  minPrice,        // Minimum price for bin 0
  maxPrice         // Maximum price for bin 0
);
```

## 📊 Position Management

### How do I check my positions?

```typescript
// Get all positions for a user
const positions = await lbServices.getUserPositions(wallet.publicKey);

// Get specific position details
const positionInfo = await lbServices.getPositionInfo(positionAddress);
```

### How do I remove liquidity?

```typescript
// Remove liquidity from a position
const result = await lbServices.removeLiquidity({
  position: positionAddress,
  user: wallet.publicKey,
  binId: 100,
  amountX: 500000, // Amount to remove
  amountY: 500000,
  slippage: 0.5
});
```

### What fees do I earn as a liquidity provider?

**Fee Structure:**
- **Base Fee**: 0.1% - 1% depending on bin configuration
- **Protocol Fee**: 10% of base fee (configurable)
- **Fee Distribution**: Proportional to liquidity provided

```typescript
// Check fee earnings
const feeInfo = await lbServices.getFeeInfo(positionAddress);
console.log("Earned fees:", {
  tokenX: feeInfo.feeX,
  tokenY: feeInfo.feeY
});
```

## ⚙️ Configuration

### How do I configure the SDK for different environments?

```typescript
// Production configuration
const prodConfig = {
  cluster: "mainnet-beta",
  rpcUrl: "https://api.mainnet-beta.solana.com",
  commitment: "confirmed",
  timeout: 30000
};

// Development configuration
const devConfig = {
  cluster: "devnet",
  rpcUrl: "https://api.devnet.solana.com",
  commitment: "processed",
  timeout: 60000
};

const lbServices = new LiquidityBookServices(
  process.env.NODE_ENV === "production" ? prodConfig : devConfig
);
```

### What are the different bin step configurations?

| Bin Step | Fee Rate | Use Case |
|----------|----------|----------|
| **1** (0.01%) | 0.01% | Very tight price ranges, low fees |
| **2** (0.02%) | 0.02% | Tight ranges, very low fees |
| **5** (0.05%) | 0.05% | Balanced precision/fees |
| **10** (0.1%) | 0.1% | Standard use case |
| **20** (0.2%) | 0.2% | Moderate slippage tolerance |
| **50** (0.5%) | 0.5% | High slippage tolerance |
| **100** (1%) | 1% | Very loose ranges |

## 🔧 Technical Questions

### What is the maximum transaction size?

**Limits:**
- **Basic Swap**: ~150,000 compute units
- **Add Liquidity**: ~200,000 compute units
- **Remove Liquidity**: ~180,000 compute units
- **Batch Operations**: ~400,000 compute units

### How do I handle large amounts?

```typescript
// For large amounts, use BigInt
const largeAmount = BigInt("1000000000000"); // 1M tokens with 6 decimals

const result = await lbServices.swap({
  // ... other params
  amount: largeAmount
});
```

### What are the supported token standards?

- **SPL Tokens**: Standard Solana tokens
- **Decimals**: 0-9 decimal places supported
- **Mint Authority**: Can be frozen or non-frozen
- **Supply**: Both fixed and variable supply

## 🛡️ Security

### Is the SDK audited?

**Yes!** The Saros DLMM SDK has undergone comprehensive security audits:

- **Phase 1**: Mathematical & Type Safety ✅ **PASSED**
- **Phase 2**: Fee Calculations & Concurrency ✅ **PASSED**
- **Phase 3**: Network & Serialization ✅ **PASSED**
- **Phase 4**: State Management & API 🔄 **IN PROGRESS**

### How do I handle private keys securely?

```typescript
// ❌ NEVER do this
const wallet = Keypair.fromSecretKey(Uint8Array.from([1,2,3,...]));

// ✅ Use wallet adapters
import { useWallet } from "@solana/wallet-adapter-react";

function SecureComponent() {
  const { publicKey, signTransaction } = useWallet();

  // Wallet handles key security
  const result = await lbServices.swap({
    // ... params
    payer: publicKey
  });
}
```

### What are the security best practices?

1. **Always validate inputs**
2. **Set reasonable slippage limits**
3. **Check balances before transactions**
4. **Use wallet adapters for key management**
5. **Test on devnet first**
6. **Monitor transaction confirmations**
7. **Implement proper error handling**

## 🚨 Error Handling

### Common error messages and solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Insufficient funds` | Not enough SOL/tokens | Check balances, add funds |
| `Invalid pair address` | Wrong pool address | Verify pool address |
| `Slippage tolerance exceeded` | Price changed too much | Increase slippage or try later |
| `Blockhash not found` | Transaction too slow | Submit immediately after signing |
| `Insufficient liquidity` | Pool too small | Reduce amount or use different pool |
| `Program failed to complete` | Various issues | Check compute budget, try again |

### How do I implement retry logic?

```typescript
async function retrySwap(params: SwapParams, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await lbServices.swap(params);
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, 1000 * Math.pow(2, i))
      );
    }
  }
}
```

## 📈 Performance

### How fast are transactions?

**Typical Performance:**
- **Swap**: 2-5 seconds confirmation
- **Add Liquidity**: 3-7 seconds confirmation
- **Remove Liquidity**: 3-6 seconds confirmation
- **Batch Operations**: 5-10 seconds confirmation

### How do I optimize for speed?

```typescript
// Use priority fees for faster processing
const tx = await lbServices.swap(params);

// Add priority fee
tx.add(ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 10000 // Higher = faster
}));

// Use confirmed commitment for balance
const result = await lbServices.connection.confirmTransaction({
  signature: signature,
  commitment: "confirmed" // Faster than "finalized"
});
```

### What affects transaction speed?

1. **Network Congestion**: High activity slows confirmations
2. **Priority Fees**: Higher fees = faster processing
3. **Compute Budget**: Complex operations take longer
4. **RPC Performance**: Faster RPC = faster confirmations

## 🔄 Migration

### Migrating from other AMMs?

**From Uniswap V3:**
- Bin system replaces tick system
- Different fee structure
- Simpler position management
- Better capital efficiency

**From Curve/Other AMMs:**
- More flexible curve types
- Better slippage control
- Advanced position strategies

### SDK Version Compatibility

| Version | Status | Breaking Changes |
|---------|--------|------------------|
| **1.4.x** | Current | None from 1.3.x |
| **1.3.x** | Legacy | Deprecated methods |
| **1.2.x** | Legacy | Major API changes |
| **1.1.x** | Legacy | Breaking changes |

## 💡 Advanced Features

### What are curve types?

1. **Constant Product**: Traditional AMM curve (x * y = k)
2. **Constant Price**: Fixed price for stable pairs
3. **Stable**: Optimized for stablecoin pairs
4. **Offset**: Custom curve with price offset

### How do I use advanced features?

```typescript
// Advanced swap with custom parameters
const result = await lbServices.swap({
  pair: poolAddress,
  amount: swapAmount,
  slippage: 0.5,
  binArraysPubkey: customBinArrays, // Custom bin arrays
  curveType: "stable", // Use stable curve
  priorityFee: 10000 // Priority fee in micro-lamports
});
```

### Can I create custom pools?

**Currently**: Use existing pools
**Future**: Pool creation API planned for v2.0

## 📞 Support

### Where can I get help?

1. **Documentation**: This comprehensive guide
2. **GitHub Issues**: For bugs and feature requests
3. **Discord Community**: For general questions
4. **Security Issues**: Email security@saros.finance

### How do I report bugs?

**Please include:**
- SDK version
- Environment (browser/node)
- Network used
- Steps to reproduce
- Expected vs actual behavior
- Error messages/logs

### What's the roadmap?

**Q1 2024:**
- Enhanced security features
- Performance optimizations
- New curve types

**Q2 2024:**
- Pool creation API
- Advanced analytics
- Mobile SDK improvements

**Q3 2024:**
- Cross-chain features
- Advanced trading strategies
- Institutional features

---

**Still have questions?** Check the [troubleshooting guide](./troubleshooting/) or create an issue on GitHub. We're here to help you build amazing DeFi applications! 🚀</content>
<parameter name="filePath">h:\Rahul Prasad 01\earn\Saros\docs\faq.md
