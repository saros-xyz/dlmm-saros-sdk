# Error Handling Example

Complete guide for handling errors and edge cases when using the Saros DLMM SDK.

## Overview

Robust error handling is crucial for production applications. This guide covers common errors and best practices for handling them.

## Prerequisites

- Node.js 16+
- npm or yarn
- Understanding of async/await and try/catch

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

## Example 1: Basic Error Handling

```typescript
async function basicErrorHandling() {
  try {
    console.log("🔄 Performing swap with basic error handling...");

    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    // Attempt swap
    const result = await lbServices.swap({
      amount: BigInt(1000000),
      isExactInput: true,
      swapForY: true,
      pair: poolAddress,
      user: wallet,
      tokenBase: pool.tokenX,
      tokenQuote: pool.tokenY,
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 6,
      slippage: 0.5
    });

    console.log("✅ Swap successful:", result);

  } catch (error) {
    console.error("❌ Swap failed:", error.message);

    // Handle specific error types
    if (error.message.includes("insufficient funds")) {
      console.log("💰 Insufficient token balance");
    } else if (error.message.includes("slippage")) {
      console.log("📉 Price slippage too high");
    } else if (error.message.includes("pool")) {
      console.log("🏊 Pool not found or inactive");
    } else {
      console.log("🤷 Unknown error occurred");
    }
  }
}
```

## Example 2: Retry Logic with Exponential Backoff

```typescript
async function retryWithBackoff(operation: () => Promise<any>, maxRetries: number = 3) {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}`);
      const result = await operation();
      console.log("✅ Operation successful on attempt", attempt);
      return result;

    } catch (error) {
      lastError = error;
      console.log(`❌ Attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s...
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Usage example
async function swapWithRetry() {
  try {
    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    const result = await retryWithBackoff(async () => {
      return await lbServices.swap({
        amount: BigInt(1000000),
        isExactInput: true,
        swapForY: true,
        pair: poolAddress,
        user: wallet,
        tokenBase: pool.tokenX,
        tokenQuote: pool.tokenY,
        tokenBaseDecimal: 6,
        tokenQuoteDecimal: 6,
        slippage: 0.5
      });
    });

    console.log("✅ Swap with retry successful:", result);

  } catch (error) {
    console.error("❌ Swap with retry failed:", error.message);
  }
}
```

## Example 3: Handling Network Errors

```typescript
async function handleNetworkErrors() {
  const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

  try {
    console.log("🌐 Attempting operation with network error handling...");

    const result = await lbServices.swap({
      amount: BigInt(1000000),
      isExactInput: true,
      swapForY: true,
      pair: poolAddress,
      user: wallet,
      tokenBase: pool.tokenX,
      tokenQuote: pool.tokenY,
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 6,
      slippage: 0.5
    });

    console.log("✅ Network operation successful:", result);

  } catch (error) {
    // Network-specific error handling
    if (error.message.includes("network") || error.message.includes("connection")) {
      console.log("🌐 Network error detected");
      console.log("💡 Suggestions:");
      console.log("  - Check internet connection");
      console.log("  - Try switching RPC endpoints");
      console.log("  - Wait for network congestion to clear");

    } else if (error.message.includes("timeout")) {
      console.log("⏱️ Request timeout");
      console.log("💡 Suggestions:");
      console.log("  - Increase timeout settings");
      console.log("  - Try during off-peak hours");
      console.log("  - Use a faster RPC endpoint");

    } else if (error.message.includes("rate limit")) {
      console.log("🚦 Rate limit exceeded");
      console.log("💡 Suggestions:");
      console.log("  - Implement request throttling");
      console.log("  - Use multiple API keys");
      console.log("  - Wait before retrying");

    } else {
      console.log("🤷 Other network error:", error.message);
    }
  }
}
```

## Example 4: Validation and Input Sanitization

```typescript
function validateSwapInputs(params: any) {
  const errors = [];

  // Validate amount
  if (!params.amount || params.amount <= 0) {
    errors.push("Amount must be positive");
  }

  // Validate slippage
  if (params.slippage < 0 || params.slippage > 1) {
    errors.push("Slippage must be between 0 and 1");
  }

  // Validate addresses
  try {
    new PublicKey(params.pair);
  } catch {
    errors.push("Invalid pool address");
  }

  try {
    new PublicKey(params.user);
  } catch {
    errors.push("Invalid user address");
  }

  // Validate decimals
  if (params.tokenBaseDecimal < 0 || params.tokenBaseDecimal > 18) {
    errors.push("Invalid token base decimals");
  }

  if (params.tokenQuoteDecimal < 0 || params.tokenQuoteDecimal > 18) {
    errors.push("Invalid token quote decimals");
  }

  return errors;
}

async function safeSwap(params: any) {
  try {
    console.log("🔍 Validating inputs...");

    const validationErrors = validateSwapInputs(params);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    console.log("✅ Inputs validated, proceeding with swap...");

    const result = await lbServices.swap(params);
    console.log("✅ Safe swap successful:", result);

    return result;

  } catch (error) {
    console.error("❌ Safe swap failed:", error.message);
    throw error;
  }
}

// Usage example
async function exampleSafeSwap() {
  const params = {
    amount: BigInt(1000000),
    isExactInput: true,
    swapForY: true,
    pair: new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD"),
    user: wallet,
    tokenBase: new PublicKey("TokenXAddress"),
    tokenQuote: new PublicKey("TokenYAddress"),
    tokenBaseDecimal: 6,
    tokenQuoteDecimal: 6,
    slippage: 0.5
  };

  try {
    await safeSwap(params);
  } catch (error) {
    console.error("Swap failed:", error.message);
  }
}
```

## Example 5: Handling Insufficient Funds

```typescript
async function handleInsufficientFunds() {
  try {
    console.log("💰 Checking balances before swap...");

    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");
    const pool = await lbServices.getPairAccount(poolAddress);

    // Check token balances (simplified - you'd use getTokenAccountBalance in production)
    const userTokenXBalance = await getTokenBalance(wallet.publicKey, pool.tokenX);
    const userTokenYBalance = await getTokenBalance(wallet.publicKey, pool.tokenY);

    console.log("Token X balance:", userTokenXBalance);
    console.log("Token Y balance:", userTokenYBalance);

    const swapAmount = BigInt(1000000);

    // Check if user has enough tokens
    if (userTokenXBalance < swapAmount) {
      throw new Error(`Insufficient Token X balance. Have: ${userTokenXBalance}, Need: ${swapAmount}`);
    }

    // Proceed with swap
    const result = await lbServices.swap({
      amount: swapAmount,
      isExactInput: true,
      swapForY: true,
      pair: poolAddress,
      user: wallet,
      tokenBase: pool.tokenX,
      tokenQuote: pool.tokenY,
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 6,
      slippage: 0.5
    });

    console.log("✅ Swap successful:", result);

  } catch (error) {
    if (error.message.includes("insufficient")) {
      console.log("💰 Insufficient funds error");
      console.log("💡 Solutions:");
      console.log("  - Deposit more tokens to your wallet");
      console.log("  - Reduce swap amount");
      console.log("  - Check token balances");
    } else {
      console.error("❌ Other error:", error.message);
    }
  }
}

async function getTokenBalance(owner: PublicKey, mint: PublicKey) {
  // Simplified - in production you'd use getTokenAccountBalance
  // This is just for demonstration
  try {
    const tokenAccount = await connection.getTokenAccountBalance(
      await getAssociatedTokenAddress(mint, owner)
    );
    return BigInt(tokenAccount.value.amount);
  } catch {
    return BigInt(0);
  }
}
```

## Example 6: Handling Slippage Errors

```typescript
async function handleSlippageErrors() {
  const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

  try {
    console.log("📉 Attempting swap with slippage protection...");

    // First, get a quote to understand expected output
    const quote = await lbServices.getQuote({
      amount: BigInt(1000000),
      isExactInput: true,
      swapForY: true,
      pair: poolAddress,
      tokenBase: pool.tokenX,
      tokenQuote: pool.tokenY,
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 6,
      slippage: 0.5
    });

    console.log("Expected output:", quote.minOutAmount);
    console.log("Price impact:", quote.priceImpact);

    // Warn if price impact is high
    if (quote.priceImpact > 0.05) { // 5% price impact
      console.log("⚠️ High price impact detected:", (quote.priceImpact * 100).toFixed(2) + "%");
      console.log("💡 Consider:");
      console.log("  - Reducing swap amount");
      console.log("  - Increasing slippage tolerance");
      console.log("  - Waiting for better market conditions");
    }

    // Proceed with swap
    const result = await lbServices.swap({
      amount: BigInt(1000000),
      isExactInput: true,
      swapForY: true,
      pair: poolAddress,
      user: wallet,
      tokenBase: pool.tokenX,
      tokenQuote: pool.tokenY,
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 6,
      slippage: 0.5
    });

    console.log("✅ Swap successful:", result);

  } catch (error) {
    if (error.message.includes("slippage") || error.message.includes("minimum")) {
      console.log("📉 Slippage error occurred");
      console.log("💡 Solutions:");
      console.log("  - Increase slippage tolerance (try 1-2%)");
      console.log("  - Reduce swap amount");
      console.log("  - Wait for more stable market conditions");
      console.log("  - Check current pool liquidity");
    } else {
      console.error("❌ Other error:", error.message);
    }
  }
}
```

## Example 7: Comprehensive Error Handler

```typescript
class DLMMErrorHandler {
  static async handleOperation(operation: () => Promise<any>, context: string) {
    try {
      console.log(`🔄 Starting ${context}...`);
      const result = await operation();
      console.log(`✅ ${context} completed successfully`);
      return result;

    } catch (error) {
      console.error(`❌ ${context} failed:`, error.message);

      // Categorize and handle different error types
      const errorType = this.categorizeError(error);

      switch (errorType) {
        case "network":
          await this.handleNetworkError(error);
          break;
        case "validation":
          this.handleValidationError(error);
          break;
        case "insufficientFunds":
          this.handleInsufficientFundsError(error);
          break;
        case "slippage":
          this.handleSlippageError(error);
          break;
        case "pool":
          this.handlePoolError(error);
          break;
        default:
          this.handleUnknownError(error);
      }

      throw error;
    }
  }

  static categorizeError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("connection") || message.includes("timeout")) {
      return "network";
    }
    if (message.includes("invalid") || message.includes("required")) {
      return "validation";
    }
    if (message.includes("insufficient") || message.includes("balance")) {
      return "insufficientFunds";
    }
    if (message.includes("slippage") || message.includes("minimum")) {
      return "slippage";
    }
    if (message.includes("pool") || message.includes("pair")) {
      return "pool";
    }
    return "unknown";
  }

  static async handleNetworkError(error: Error) {
    console.log("🌐 Network Error Solutions:");
    console.log("  - Check internet connection");
    console.log("  - Switch RPC endpoints");
    console.log("  - Wait for network congestion to clear");
    console.log("  - Implement retry with exponential backoff");
  }

  static handleValidationError(error: Error) {
    console.log("🔍 Validation Error Solutions:");
    console.log("  - Check all required parameters");
    console.log("  - Verify address formats");
    console.log("  - Ensure amounts are positive");
    console.log("  - Validate slippage values");
  }

  static handleInsufficientFundsError(error: Error) {
    console.log("💰 Insufficient Funds Solutions:");
    console.log("  - Deposit more tokens");
    console.log("  - Reduce transaction amount");
    console.log("  - Check token balances");
    console.log("  - Verify token accounts exist");
  }

  static handleSlippageError(error: Error) {
    console.log("📉 Slippage Error Solutions:");
    console.log("  - Increase slippage tolerance");
    console.log("  - Reduce swap amount");
    console.log("  - Wait for better liquidity");
    console.log("  - Check current market conditions");
  }

  static handlePoolError(error: Error) {
    console.log("🏊 Pool Error Solutions:");
    console.log("  - Verify pool address");
    console.log("  - Check if pool is active");
    console.log("  - Ensure sufficient liquidity");
    console.log("  - Try different pool");
  }

  static handleUnknownError(error: Error) {
    console.log("🤷 Unknown Error:");
    console.log("  - Check error logs for details");
    console.log("  - Contact support if persists");
    console.log("  - Try again later");
  }
}

// Usage example
async function exampleComprehensiveErrorHandling() {
  const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

  try {
    await DLMMErrorHandler.handleOperation(async () => {
      return await lbServices.swap({
        amount: BigInt(1000000),
        isExactInput: true,
        swapForY: true,
        pair: poolAddress,
        user: wallet,
        tokenBase: pool.tokenX,
        tokenQuote: pool.tokenY,
        tokenBaseDecimal: 6,
        tokenQuoteDecimal: 6,
        slippage: 0.5
      });
    }, "token swap");

  } catch (error) {
    console.log("Operation failed, but error was handled gracefully");
  }
}
```

## Complete Working Script

```typescript
// error-handling.ts
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
    console.log("🚀 Starting error handling example...");

    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    // Example 1: Basic error handling
    console.log("Step 1: Basic error handling...");
    await basicErrorHandling();

    // Example 2: Retry logic
    console.log("Step 2: Retry with backoff...");
    await swapWithRetry();

    // Example 3: Network errors
    console.log("Step 3: Network error handling...");
    await handleNetworkErrors();

    console.log("🎉 Error handling example complete!");

  } catch (error) {
    console.error("❌ Example failed:", error.message);
    process.exit(1);
  }
}

async function basicErrorHandling() {
  try {
    const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

    const result = await lbServices.swap({
      amount: BigInt(1000000),
      isExactInput: true,
      swapForY: true,
      pair: poolAddress,
      user: wallet,
      tokenBase: pool.tokenX,
      tokenQuote: pool.tokenY,
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 6,
      slippage: 0.5
    });

    console.log("Swap successful:", result);

  } catch (error) {
    console.error("Swap failed:", error.message);
  }
}

async function swapWithRetry() {
  const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

  try {
    const result = await retryWithBackoff(async () => {
      return await lbServices.swap({
        amount: BigInt(1000000),
        isExactInput: true,
        swapForY: true,
        pair: poolAddress,
        user: wallet,
        tokenBase: pool.tokenX,
        tokenQuote: pool.tokenY,
        tokenBaseDecimal: 6,
        tokenQuoteDecimal: 6,
        slippage: 0.5
      });
    });

    console.log("Swap with retry successful:", result);

  } catch (error) {
    console.error("Swap with retry failed:", error.message);
  }
}

async function retryWithBackoff(operation: () => Promise<any>, maxRetries: number = 3) {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;

      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

async function handleNetworkErrors() {
  const poolAddress = new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD");

  try {
    const result = await lbServices.swap({
      amount: BigInt(1000000),
      isExactInput: true,
      swapForY: true,
      pair: poolAddress,
      user: wallet,
      tokenBase: pool.tokenX,
      tokenQuote: pool.tokenY,
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 6,
      slippage: 0.5
    });

    console.log("Network operation successful:", result);

  } catch (error) {
    if (error.message.includes("network") || error.message.includes("connection")) {
      console.log("Network error detected");
    } else {
      console.error("Other error:", error.message);
    }
  }
}

main().catch(console.error);
```

## Running the Example

```bash
# Install dependencies
npm install @saros-finance/dlmm-sdk

# Run the example
npx ts-node error-handling.ts
```

## Error Types and Solutions

### Network Errors
- **Connection timeout**: Increase timeout, try different RPC
- **Rate limiting**: Implement throttling, use multiple endpoints
- **Network congestion**: Wait and retry, use priority fees

### Validation Errors
- **Invalid addresses**: Verify PublicKey formats
- **Missing parameters**: Check all required fields
- **Invalid amounts**: Ensure positive values
- **Wrong decimals**: Verify token decimal places

### Transaction Errors
- **Insufficient funds**: Check balances, deposit tokens
- **Slippage too high**: Increase tolerance, reduce amount
- **Pool inactive**: Verify pool status, try different pool
- **Account not found**: Create associated token accounts

### SDK Errors
- **Version mismatch**: Update to latest SDK version
- **Configuration error**: Check cluster and RPC settings
- **Permission denied**: Verify wallet permissions

## Best Practices

### Error Prevention
- **Input validation**: Always validate before operations
- **Balance checks**: Verify sufficient funds
- **Network monitoring**: Check connection health
- **Slippage protection**: Set appropriate tolerance

### Error Recovery
- **Retry logic**: Implement exponential backoff
- **Fallback options**: Have alternative RPC endpoints
- **Graceful degradation**: Continue with reduced functionality
- **User feedback**: Provide clear error messages

### Monitoring and Logging
- **Error tracking**: Log all errors with context
- **Metrics collection**: Track error rates and types
- **Alert system**: Notify on critical errors
- **Performance monitoring**: Track operation success rates

## Next Steps

- Learn about [Basic Swaps](./basic-swap.md)
- Explore [Liquidity Management](./liquidity-management.md)
- Understand [Pool Analytics](./pool-analytics.md)

---

**Need help?** Check the [troubleshooting guide](../troubleshooting/index.md) or ask in our [Discord community](https://discord.gg/saros)!
