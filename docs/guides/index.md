# Guides

Step-by-step tutorials for common Saros DLMM operations.

## Table of Contents

- [Token Swapping](./swapping.md) - Complete swap implementation
- [Liquidity Provision](./liquidity-provision.md) - Add/remove liquidity
- [Position Management](./position-management.md) - Manage liquidity positions
- [Pool Creation](./pool-creation.md) - Create new trading pools
- [Fee Management](./fee-management.md) - Handle fees and rewards
- [Advanced Strategies](./advanced-strategies.md) - Complex trading strategies

## Quick Start

Each guide includes:
- ✅ **Prerequisites** - What you need before starting
- ✅ **Step-by-step instructions** - Detailed implementation
- ✅ **Code examples** - Working TypeScript code
- ✅ **Error handling** - Common issues and solutions
- ✅ **Best practices** - Optimization tips

## Before You Begin

### Environment Setup

```typescript
import {
  LiquidityBookServices,
  MODE,
  BIN_STEP_CONFIGS
} from "@saros-finance/dlmm-sdk";
import { PublicKey, Keypair } from "@solana/web3.js";

// Initialize SDK
const lbServices = new LiquidityBookServices({
  mode: MODE.MAINNET // or MODE.DEVNET for testing
});

// Your wallet (replace with actual wallet)
const userWallet = Keypair.generate();
```

### Common Token Addresses

```typescript
// Mainnet
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const C98_MINT = new PublicKey("C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9");
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

// Devnet
const DEV_USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const DEV_C98_MINT = new PublicKey("C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9");
```

### Error Handling Pattern

```typescript
async function safeExecute(operation: () => Promise<any>) {
  try {
    const result = await operation();
    console.log("✅ Success:", result);
    return result;
  } catch (error) {
    console.error("❌ Error:", error.message);

    // Handle specific errors
    if (error.message.includes("Slippage")) {
      console.log("💡 Try increasing slippage tolerance");
    } else if (error.message.includes("Insufficient")) {
      console.log("💡 Check token balances");
    }

    throw error;
  }
}
```

## Guide Index

### 🔄 [Token Swapping](./swapping.md)
Learn how to perform token swaps with optimal routing and slippage protection.

**What you'll build:**
- Basic token swap
- Advanced swap with custom parameters
- Batch swapping
- Price impact analysis

### 💧 [Liquidity Provision](./liquidity-provision.md)
Master liquidity provision with different distribution strategies.

**What you'll build:**
- Single-sided liquidity provision
- Multi-bin position creation
- Liquidity distribution optimization
- Impermanent loss management

### 📊 [Position Management](./position-management.md)
Manage your liquidity positions effectively.

**What you'll build:**
- Position monitoring dashboard
- Automated rebalancing
- Fee harvesting system
- Risk management tools

### 🏗️ [Pool Creation](./pool-creation.md)
Create and configure new liquidity pools.

**What you'll build:**
- Custom pool creation
- Fee parameter optimization
- Initial liquidity setup
- Pool governance

### 💰 [Fee Management](./fee-management.md)
Handle fees, rewards, and incentives.

**What you'll build:**
- Fee collection automation
- Reward claiming system
- Fee analysis dashboard
- Incentive optimization

### 🚀 [Advanced Strategies](./advanced-strategies.md)
Implement sophisticated trading strategies.

**What you'll build:**
- Arbitrage detection
- Market making bots
- Yield farming strategies
- Risk parity portfolios

## Code Patterns

### Transaction Submission

```typescript
async function submitTransaction(tx: Transaction): Promise<string> {
  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } =
    await lbServices.connection.getLatestBlockhash();

  // Update transaction
  tx.recentBlockhash = blockhash;
  tx.feePayer = userWallet.publicKey;
  tx.sign(userWallet);

  // Submit transaction
  const signature = await lbServices.connection.sendRawTransaction(
    tx.serialize(),
    { skipPreflight: false }
  );

  // Confirm transaction
  await lbServices.connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight
  });

  return signature;
}
```

### Balance Checking

```typescript
async function getTokenBalance(mint: PublicKey, owner: PublicKey): Promise<number> {
  const ata = await spl.getAssociatedTokenAddress(mint, owner);
  const account = await lbServices.connection.getTokenAccountBalance(ata);
  return Number(account.value.amount);
}
```

### Price Monitoring

```typescript
async function monitorPrice(poolAddress: PublicKey) {
  const pairInfo = await lbServices.getPairAccount(poolAddress);
  const currentPrice = getPriceFromId(pairInfo.activeId, pairInfo.binStep);

  console.log(`Current price: ${currentPrice}`);
  return currentPrice;
}
```

## Best Practices

### Performance Optimization

1. **Batch Operations** - Combine multiple operations in single transaction
2. **Cache Data** - Cache frequently accessed data (pool info, positions)
3. **Connection Pooling** - Reuse connections for multiple requests
4. **Error Recovery** - Implement retry logic for failed operations

### Security Considerations

1. **Input Validation** - Always validate user inputs
2. **Slippage Protection** - Set appropriate slippage tolerances
3. **Transaction Timeouts** - Set reasonable transaction timeouts
4. **Balance Checks** - Verify sufficient balances before operations

### Monitoring & Analytics

1. **Transaction Tracking** - Monitor all transaction statuses
2. **Performance Metrics** - Track operation success rates
3. **Error Logging** - Log all errors with context
4. **Gas Optimization** - Monitor and optimize transaction costs

## Support & Resources

- 📚 **[API Reference](../api-reference/)** - Complete method documentation
- 💡 **[Examples](../examples/)** - Working code samples
- 🔒 **[Security](../security/)** - Security best practices
- ❓ **[Troubleshooting](../troubleshooting/)** - Common issues and solutions

## Contributing

Found an issue or want to improve a guide?

1. **Report Issues** - [GitHub Issues](https://github.com/saros-xyz/dlmm-sdk/issues)
2. **Suggest Improvements** - [Discussions](https://github.com/saros-xyz/dlmm-sdk/discussions)
3. **Contribute Code** - [Pull Requests](https://github.com/saros-xyz/dlmm-sdk/pulls)

---

**Ready to start building? Choose a guide above or check our [Getting Started](../getting-started/) section!**</content>
<parameter name="filePath">h:\Rahul Prasad 01\earn\Saros\docs\guides\index.md
