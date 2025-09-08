# Troubleshooting

Common issues, debugging tips, and solutions for the Saros DLMM SDK.

## 🔍 Quick Issue Diagnosis

### Connection Issues

**Problem**: `Connection to cluster failed`
```typescript
// Error: Connection to cluster failed
```

**Solutions**:
1. **Check Network Configuration**
```typescript
// ✅ GOOD: Explicit network configuration
const lbServices = new LiquidityBookServices({
  cluster: "mainnet-beta", // or "devnet", "testnet"
  rpcUrl: "https://api.mainnet-beta.solana.com"
});
```

2. **Verify RPC Endpoint**
```typescript
// Test RPC connection
try {
  const version = await lbServices.connection.getVersion();
  console.log("RPC connected:", version);
} catch (error) {
  console.error("RPC connection failed:", error);
}
```

3. **Check Firewall Settings**
   - Ensure port 443 (HTTPS) is open
   - Verify no VPN/proxy interference
   - Try different RPC endpoints

### Transaction Failures

**Problem**: `Transaction simulation failed`
```typescript
// Error: Transaction simulation failed: Insufficient funds
```

**Common Causes & Solutions**:

1. **Insufficient SOL Balance**
```typescript
// Check SOL balance
const balance = await lbServices.connection.getBalance(wallet.publicKey);
console.log("SOL Balance:", balance / LAMPORTS_PER_SOL);

// Minimum required: 0.001 SOL for basic transactions
if (balance < 1000000) { // 0.001 SOL
  throw new Error("Insufficient SOL for transaction fees");
}
```

2. **Token Account Issues**
```typescript
// Check token balance
const tokenBalance = await getTokenBalance(tokenMint, wallet.publicKey);
if (tokenBalance < amount) {
  throw new Error("Insufficient token balance");
}

// Check if token account exists
const tokenAccount = await getAssociatedTokenAddress(
  tokenMint,
  wallet.publicKey
);
const accountInfo = await lbServices.connection.getAccountInfo(tokenAccount);
if (!accountInfo) {
  throw new Error("Token account not found. Please create it first.");
}
```

3. **Slippage Too Low**
```typescript
// Increase slippage tolerance
const result = await lbServices.swap({
  // ... other params
  slippage: 0.5 // 0.5% instead of default 0.1%
});
```

## 🚨 Common Error Messages

### "Invalid pair address"

**Cause**: Pool address is incorrect or doesn't exist
```typescript
// ✅ GOOD: Validate pool first
const poolInfo = await lbServices.getPairAccount(pairAddress);
if (!poolInfo) {
  throw new Error("Invalid pool address");
}
```

### "Insufficient liquidity"

**Cause**: Pool has insufficient liquidity for the swap amount
```typescript
// Check pool liquidity
const poolState = await lbServices.getPairAccount(pairAddress);
console.log("Pool liquidity:", poolState.liquidity);

// Reduce swap amount or find alternative pool
```

### "Blockhash not found"

**Cause**: Transaction took too long to sign/submit
```typescript
// ✅ GOOD: Set transaction timeout
const tx = await lbServices.swap(params);
tx.lastValidBlockHeight = (await lbServices.connection.getLatestBlockhash())
  .lastValidBlockHeight;

// Submit immediately after signing
```

### "Program failed to complete"

**Cause**: Various program execution errors
```typescript
// Enable detailed error logging
const result = await lbServices.swap({
  // ... params
  computeUnitLimit: 200000, // Increase compute budget
  computeUnitPrice: 1000    // Set priority fee
});
```

## 🐛 Debugging Tools

### Enable Debug Logging

```typescript
// Enable detailed logging
import { Logger } from "@saros-finance/dlmm-sdk";

Logger.setLevel("debug");

// All SDK operations will now log detailed information
const result = await lbServices.swap(params);
```

### Transaction Inspector

```typescript
// Inspect transaction before submission
const tx = await lbServices.swap(params);

// Log transaction details
console.log("Transaction:", {
  instructions: tx.instructions.length,
  accounts: tx.keys.length,
  recentBlockhash: tx.recentBlockhash,
  feePayer: tx.feePayer?.toString()
});

// Simulate transaction
const simulation = await lbServices.connection.simulateTransaction(tx);
if (simulation.value.err) {
  console.error("Simulation failed:", simulation.value.err);
}
```

### Balance Checker

```typescript
// Comprehensive balance check
async function checkBalances(wallet: PublicKey, tokenXMint: PublicKey, tokenYMint: PublicKey) {
  const solBalance = await lbServices.connection.getBalance(wallet);
  const tokenXBalance = await getTokenBalance(tokenXMint, wallet);
  const tokenYBalance = await getTokenBalance(tokenYMint, wallet);

  console.log("Balances:", {
    SOL: solBalance / LAMPORTS_PER_SOL,
    TokenX: tokenXBalance,
    TokenY: tokenYBalance
  });

  return { solBalance, tokenXBalance, tokenYBalance };
}
```

## 🔧 Configuration Issues

### Environment Setup

**Problem**: SDK not working in different environments

**Solutions**:

1. **Browser Environment**
```typescript
// For browser usage
import { LiquidityBookServices } from "@saros-finance/dlmm-sdk/web";

// Use web-specific build
const lbServices = new LiquidityBookServices({
  cluster: "mainnet-beta"
});
```

2. **Node.js Environment**
```typescript
// For Node.js usage
import { LiquidityBookServices } from "@saros-finance/dlmm-sdk/node";

// Configure with custom RPC
const lbServices = new LiquidityBookServices({
  rpcUrl: process.env.RPC_URL || "https://api.mainnet-beta.solana.com"
});
```

3. **React Native / Mobile**
```typescript
// For mobile environments
import { LiquidityBookServices } from "@saros-finance/dlmm-sdk/mobile";

// Use mobile-optimized settings
const lbServices = new LiquidityBookServices({
  cluster: "mainnet-beta",
  commitment: "confirmed" // Faster confirmations
});
```

### Network Configuration

**Problem**: Wrong network configuration

```typescript
// ✅ GOOD: Environment-based configuration
const NETWORK_CONFIGS = {
  mainnet: {
    cluster: "mainnet-beta",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    programId: new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo")
  },
  devnet: {
    cluster: "devnet",
    rpcUrl: "https://api.devnet.solana.com",
    programId: new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo")
  }
};

const config = NETWORK_CONFIGS[process.env.NETWORK || "devnet"];
const lbServices = new LiquidityBookServices(config);
```

## 💰 Fee & Gas Issues

### High Transaction Fees

**Problem**: Transactions costing too much SOL

**Solutions**:

1. **Optimize Compute Budget**
```typescript
// Set reasonable compute limits
const tx = await lbServices.swap({
  // ... params
  computeUnitLimit: 150000,  // Reasonable limit
  computeUnitPrice: 500      // Lower priority fee
});
```

2. **Batch Operations**
```typescript
// Batch multiple operations
const instructions = [];

// Add multiple swaps to single transaction
instructions.push(await lbServices.swapInstruction(params1));
instructions.push(await lbServices.swapInstruction(params2));

// Execute as single transaction
const tx = new Transaction().add(...instructions);
```

3. **Use Cheaper RPC Endpoints**
```typescript
// Try different RPC providers
const RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",     // Free, rate limited
  "https://solana-api.projectserum.com",     // Alternative free
  "https://rpc.ankr.com/solana",             // Ankr (free tier)
  "https://ssc-dao.genesysgo.net"            // GenesysGo (paid)
];
```

### Insufficient Funds for Fees

```typescript
// Calculate required fees
const feeEstimate = await lbServices.connection.getFeeForMessage(
  tx.compileMessage()
);

const requiredSOL = feeEstimate.value + 1000000; // Add buffer
const currentSOL = await lbServices.connection.getBalance(wallet.publicKey);

if (currentSOL < requiredSOL) {
  const shortfall = requiredSOL - currentSOL;
  throw new Error(`Need additional ${shortfall / LAMPORTS_PER_SOL} SOL for fees`);
}
```

## 🔄 Synchronization Issues

### State Desynchronization

**Problem**: Local state doesn't match blockchain state

**Solutions**:

1. **Force Refresh**
```typescript
// Refresh pool state
await lbServices.refreshPoolState(pairAddress);

// Get fresh data
const freshPoolInfo = await lbServices.getPairAccount(pairAddress);
```

2. **Implement Retry Logic**
```typescript
async function retryOperation(operation: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}

// Usage
const result = await retryOperation(() => lbServices.swap(params));
```

3. **Monitor Network Status**
```typescript
// Check network health
const performance = await lbServices.connection.getRecentPerformanceSamples(1);
const avgSlotTime = performance[0]?.samplePeriodSecs / performance[0]?.numSlots;

if (avgSlotTime > 1) {
  console.warn("Network is congested. Transactions may be slower.");
}
```

## 📊 Performance Issues

### Slow Transaction Confirmations

**Problem**: Transactions taking too long to confirm

**Solutions**:

1. **Adjust Commitment Level**
```typescript
// For faster confirmations (less secure)
const result = await lbServices.swap(params, {
  commitment: "confirmed" // Instead of "finalized"
});
```

2. **Use Priority Fees**
```typescript
// Add priority fee for faster processing
const tx = await lbServices.swap(params);
tx.add(ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 10000 // Higher = faster processing
}));
```

3. **Monitor Network Load**
```typescript
// Check current network load
const { blockhash, lastValidBlockHeight } =
  await lbServices.connection.getLatestBlockhash();

const currentSlot = await lbServices.connection.getSlot();
const recentBlock = await lbServices.connection.getConfirmedBlock(currentSlot - 1);

console.log("Network status:", {
  slot: currentSlot,
  transactionsInBlock: recentBlock.transactions.length,
  blockTime: recentBlock.blockTime
});
```

## 🔐 Security-Related Issues

### Wallet Connection Problems

**Problem**: Wallet not connecting or signing

```typescript
// ✅ GOOD: Proper wallet error handling
try {
  const result = await lbServices.swap(params);
} catch (error) {
  if (error.message.includes("User rejected")) {
    console.log("User cancelled transaction");
  } else if (error.message.includes("Wallet not connected")) {
    console.log("Please connect your wallet");
  } else {
    console.error("Transaction failed:", error);
  }
}
```

### Permission Errors

**Problem**: Insufficient permissions for operation

```typescript
// Check wallet permissions
const wallet = useWallet();
if (!wallet.connected) {
  throw new Error("Wallet not connected");
}

if (!wallet.publicKey) {
  throw new Error("Wallet public key not available");
}

// For token operations, check token account ownership
const tokenAccount = await getAssociatedTokenAddress(tokenMint, wallet.publicKey);
const accountInfo = await lbServices.connection.getAccountInfo(tokenAccount);

if (accountInfo.owner.toString() !== wallet.publicKey.toString()) {
  throw new Error("Token account not owned by wallet");
}
```

## 📞 Getting Help

### Debug Information Collection

When reporting issues, please include:

```typescript
// Collect debug information
const debugInfo = {
  sdkVersion: "1.4.0",
  network: lbServices.cluster,
  wallet: wallet.publicKey?.toString(),
  solBalance: await lbServices.connection.getBalance(wallet.publicKey),
  nodeVersion: process.version,
  timestamp: new Date().toISOString()
};

console.log("Debug Info:", JSON.stringify(debugInfo, null, 2));
```

### Support Channels

1. **GitHub Issues**: For bugs and feature requests
2. **Discord**: For community support
3. **Documentation**: Check this troubleshooting guide first
4. **Security Issues**: Email security@saros.finance (not GitHub)

### Issue Report Template

```
**SDK Version**: 1.4.0
**Environment**: Browser/Node.js
**Network**: mainnet-beta/devnet
**Error Message**: [exact error]
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**: [what should happen]
**Actual Behavior**: [what actually happens]

**Debug Info**: [paste debug info here]
```

## 🚀 Advanced Troubleshooting

### Memory Issues

**Problem**: High memory usage or leaks

```typescript
// Monitor memory usage
if (typeof performance !== 'undefined' && performance.memory) {
  console.log("Memory usage:", {
    used: performance.memory.usedJSHeapSize,
    total: performance.memory.totalJSHeapSize,
    limit: performance.memory.jsHeapSizeLimit
  });
}

// Clean up resources
lbServices.connection.removeAllListeners();
```

### Network Timeout Issues

**Problem**: Requests timing out

```typescript
// Configure timeouts
const lbServices = new LiquidityBookServices({
  cluster: "mainnet-beta",
  timeout: 30000, // 30 seconds
  confirmTransactionTimeout: 60000 // 60 seconds
});
```

### Rate Limiting

**Problem**: Too many requests

```typescript
// Implement request throttling
class RequestThrottler {
  private lastRequest = 0;
  private readonly minInterval = 100; // ms

  async throttle<T>(request: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequest;

    if (timeSinceLast < this.minInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minInterval - timeSinceLast)
      );
    }

    this.lastRequest = Date.now();
    return request();
  }
}

const throttler = new RequestThrottler();
const result = await throttler.throttle(() => lbServices.getPairAccount(pair));
```

---

**Most issues can be resolved by following these troubleshooting steps. If you continue to experience problems, please create a detailed issue report with the debug information above.**</content>
<parameter name="filePath">h:\Rahul Prasad 01\earn\Saros\docs\troubleshooting\index.md
