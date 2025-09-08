# 📖 API Reference

**Complete API documentation for the Saros DLMM SDK.** All methods, parameters, return types, and examples organized by functionality.

## 🚀 Quick Start

```typescript
import { LiquidityBookServices } from "@saros-finance/dlmm-sdk";

const lbServices = new LiquidityBookServices({
  cluster: "mainnet-beta"
});
```

## 📋 API Architecture

```mermaid
graph TB
    subgraph "Core SDK"
        A[LiquidityBookServices]
    end

    subgraph "Trading Operations"
        B[swap()]
        C[getQuote()]
        D[batchSwap()]
    end

    subgraph "Liquidity Operations"
        E[addLiquidity()]
        F[removeLiquidity()]
        G[getPosition()]
    end

    subgraph "Analytics Operations"
        H[getPairAccount()]
        I[getPositions()]
        J[getUserPositions()]
    end

    A --> B
    A --> C
    A --> D
    A --> E
    A --> F
    A --> G
    A --> H
    A --> I
    A --> J

    style A fill:#e3f2fd
    style B fill:#e8f5e8
    style C fill:#e8f5e8
    style D fill:#fff3e0
    style E fill:#e8f5e8
    style F fill:#ffebee
    style G fill:#e8f5e8
    style H fill:#fff3e0
    style I fill:#fff3e0
    style J fill:#fff3e0
```

## 📋 Table of Contents

| Category | Description | Key Methods |
|----------|-------------|-------------|
| **[🔧 Core Methods](#-core-methods)** | Essential trading and liquidity operations | `swap`, `addLiquidity`, `getQuote` |
| **[💰 Liquidity Methods](#-liquidity-methods)** | Position management and liquidity provision | `removeLiquidity`, `getPosition`, `claimFees` |
| **[📊 Analytics Methods](#-analytics-methods)** | Pool data, quotes, and market analysis | `getPairAccount`, `getPositions`, `getUserPositions` |
| **[⚙️ Configuration](#️-configuration)** | SDK setup and network configuration | Constructor options, network settings |
| **[📝 Types](#-types)** | TypeScript interfaces and enums | `SwapParams`, `LiquidityParams`, `Position` |
| **[🛠️ Utilities](#️-utilities)** | Helper functions and utilities | Math helpers, address utilities |

---

## 🔧 Core Methods

### `swap(params: SwapParams): Promise<SwapResult>`

Execute a token swap through DLMM pools with optimal price execution.

#### Parameters

```typescript
interface SwapParams {
  pair: PublicKey;              // Pool address to swap in
  amount: bigint;               // Amount to swap (in smallest units)
  slippage: number;             // Max slippage tolerance (0.5 = 0.5%)
  payer: PublicKey;             // Transaction payer public key
  isExactInput?: boolean;       // true for exact input, false for exact output (default: true)
  swapForY?: boolean;           // true for X→Y swap, false for Y→X swap
  tokenBase?: PublicKey;        // Base token mint address (optional)
  tokenQuote?: PublicKey;       // Quote token mint address (optional)
  tokenBaseDecimal?: number;    // Base token decimals (optional)
  tokenQuoteDecimal?: number;   // Quote token decimals (optional)
  priorityFee?: number;         // Priority fee in microlamports (optional)
  commitment?: Commitment;      // Transaction commitment level (default: "confirmed")
}
```

#### Returns

```typescript
interface SwapResult {
  signature: string;            // Transaction signature
  success: boolean;             // Operation success status
  amountIn: bigint;             // Actual amount swapped in
  amountOut: bigint;            // Actual amount received
  fee: number;                  // Fee paid (in basis points)
  priceImpact: number;          // Price impact percentage
  executionTime: number;        // Execution time in milliseconds
}
```

#### Example

```typescript
const result = await lbServices.swap({
  pair: new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD"),
  amount: BigInt(1000000), // 1 C98
  slippage: 0.5, // 0.5% max slippage
  payer: wallet.publicKey
});

console.log(`✅ Swap successful: ${result.signature}`);
console.log(`📊 Received: ${result.amountOut} tokens`);
```

#### Error Handling

```typescript
try {
  const result = await lbServices.swap(swapParams);
} catch (error) {
  if (error.code === 'INSUFFICIENT_LIQUIDITY') {
    console.error('Not enough liquidity in pool');
  } else if (error.code === 'SLIPPAGE_TOLERANCE_EXCEEDED') {
    console.error('Price slippage too high');
  } else {
    console.error('Swap failed:', error.message);
  }
}
```

### `getQuote(params: QuoteParams): Promise<QuoteResult>`

Get a quote for a potential swap without executing the transaction.

#### Parameters

```typescript
interface QuoteParams {
  pair: PublicKey;              // Pool address
  amount: bigint;               // Amount to quote (in smallest units)
  isExactInput: boolean;        // true for exact input quote, false for exact output
  swapForY: boolean;            // true for X→Y quote, false for Y→X
  tokenBase?: PublicKey;        // Base token mint (optional)
  tokenQuote?: PublicKey;       // Quote token mint (optional)
  tokenBaseDecimal?: number;    // Base token decimals (optional)
  tokenQuoteDecimal?: number;   // Quote token decimals (optional)
  slippage?: number;            // Slippage tolerance for quote (optional)
}
```

#### Returns

```typescript
interface QuoteResult {
  amountIn: bigint;             // Expected input amount
  amountOut: bigint;            // Expected output amount
  fee: number;                  // Estimated fee (basis points)
  priceImpact: number;          // Estimated price impact (%)
  minimumOut: bigint;           // Minimum output with slippage
  path: PublicKey[];            // Swap path (for multi-hop)
  executionPrice: number;       // Execution price
}
```

#### Example

```typescript
const quote = await lbServices.getQuote({
  pair: C98_USDC_POOL,
  amount: BigInt(1000000),
  isExactInput: true,
  swapForY: true,
  slippage: 0.5
});

console.log(`Expected output: ${quote.amountOut} USDC`);
console.log(`Price impact: ${quote.priceImpact}%`);
console.log(`Minimum received: ${quote.minimumOut} USDC`);
```

---

## 💰 Liquidity Methods

### `addLiquidity(params: LiquidityParams): Promise<LiquidityResult>`

Add liquidity to a DLMM pool and create a liquidity position.

#### Parameters

```typescript
interface LiquidityParams {
  pair: PublicKey;              // Pool address
  amountX: bigint;              // Amount of token X to add
  amountY: bigint;              // Amount of token Y to add
  binId: number;                // Target bin ID for liquidity
  slippage: number;             // Max slippage tolerance
  payer: PublicKey;             // Transaction payer
  positionOwner?: PublicKey;    // Position owner (default: payer)
}
```

#### Returns

```typescript
interface LiquidityResult {
  signature: string;            // Transaction signature
  positionAddress: PublicKey;   // New position address
  amountXAdded: bigint;         // Actual X amount added
  amountYAdded: bigint;         // Actual Y amount added
  binId: number;                // Bin where liquidity was added
  liquidity: bigint;            // Liquidity tokens minted
}
```

#### Example

```typescript
const result = await lbServices.addLiquidity({
  pair: C98_USDC_POOL,
  amountX: BigInt(10000000), // 10 C98
  amountY: BigInt(10000000), // 10 USDC
  binId: 100, // Target price bin
  slippage: 0.5,
  payer: wallet.publicKey
});

console.log(`✅ Liquidity added: ${result.signature}`);
console.log(`📍 Position: ${result.positionAddress}`);
```

### `removeLiquidity(params: RemoveLiquidityParams): Promise<RemoveLiquidityResult>`

Remove liquidity from a position and claim accumulated fees.

#### Parameters

```typescript
interface RemoveLiquidityParams {
  positionAddress: PublicKey;   // Position to remove from
  amount: bigint;               // Amount of liquidity to remove
  payer: PublicKey;             // Transaction payer
  slippage?: number;            // Slippage tolerance (optional)
}
```

#### Returns

```typescript
interface RemoveLiquidityResult {
  signature: string;            // Transaction signature
  amountXRemoved: bigint;       // X tokens received
  amountYRemoved: bigint;       // Y tokens received
  feesX: bigint;                // X token fees claimed
  feesY: bigint;                // Y token fees claimed
}
```

#### Example

```typescript
const result = await lbServices.removeLiquidity({
  positionAddress: new PublicKey("POSITION_ADDRESS"),
  amount: BigInt(5000000), // Remove 50% of position
  payer: wallet.publicKey
});

console.log(`✅ Removed liquidity: ${result.signature}`);
console.log(`💰 Fees claimed: ${result.feesX} X, ${result.feesY} Y`);
```

---

## 📊 Analytics Methods

### `getPairAccount(pairAddress: PublicKey): Promise<PairAccount>`

Get detailed information about a DLMM pool.

#### Parameters

```typescript
pairAddress: PublicKey  // Pool address to query
```

#### Returns

```typescript
interface PairAccount {
  address: PublicKey;           // Pool address
  tokenX: PublicKey;            // Token X mint
  tokenY: PublicKey;            // Token Y mint
  reserveX: bigint;             // Token X reserves
  reserveY: bigint;             // Token Y reserves
  activeBinId: number;          // Current active bin
  binStep: number;              // Bin step size
  totalLiquidity: bigint;       // Total liquidity in pool
  price: number;                // Current price
  fees: FeeInfo;                // Fee configuration
  status: PoolStatus;           // Pool status
}
```

#### Example

```typescript
const pool = await lbServices.getPairAccount(C98_USDC_POOL);

console.log(`📊 Pool: ${pool.address}`);
console.log(`💰 Reserves: ${pool.reserveX} X, ${pool.reserveY} Y`);
console.log(`📈 Price: $${pool.price}`);
console.log(`🎯 Active Bin: ${pool.activeBinId}`);
```

### `getPositions(userAddress: PublicKey): Promise<Position[]>`

Get all liquidity positions for a user across all pools.

#### Parameters

```typescript
userAddress: PublicKey  // User address to query positions for
```

#### Returns

```typescript
interface Position {
  address: PublicKey;           // Position address
  pair: PublicKey;              // Pool address
  owner: PublicKey;             // Position owner
  binId: number;                // Bin ID
  amountX: bigint;              // Token X amount
  amountY: bigint;              // Token Y amount
  feesX: bigint;                // Accumulated X fees
  feesY: bigint;                // Accumulated Y fees
  apr: number;                  // Annual percentage rate
  createdAt: Date;              // Position creation time
  lastUpdated: Date;            // Last update time
}
```

#### Example

```typescript
const positions = await lbServices.getPositions(wallet.publicKey);

positions.forEach(pos => {
  console.log(`📍 Position: ${pos.address}`);
  console.log(`💰 Value: ${pos.amountX} X + ${pos.amountY} Y`);
  console.log(`📈 APR: ${pos.apr}%`);
  console.log(`💵 Fees: ${pos.feesX} X, ${pos.feesY} Y`);
});
```

---

## ⚙️ Configuration

### SDK Constructor Options

```typescript
interface SDKConfig {
  cluster: "mainnet-beta" | "devnet" | "testnet" | "localnet";
  rpcUrl?: string;                    // Custom RPC endpoint
  commitment?: Commitment;            // Default: "confirmed"
  preflightCommitment?: Commitment;   // Default: "confirmed"
  confirmTransactionInitialTimeout?: number; // Default: 60000ms
  debug?: boolean;                    // Enable debug logging
  logLevel?: "error" | "warn" | "info" | "debug";
}
```

#### Example Configurations

```typescript
// Production configuration
const prodSdk = new LiquidityBookServices({
  cluster: "mainnet-beta",
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 60000
});

// Development configuration
const devSdk = new LiquidityBookServices({
  cluster: "devnet",
  debug: true,
  logLevel: "debug"
});

// Custom RPC configuration
const customSdk = new LiquidityBookServices({
  cluster: "mainnet-beta",
  rpcUrl: "https://your-custom-rpc.com",
  commitment: "finalized"
});
```

---

## 📝 Type Definitions

### Core Types

```typescript
// Commitment levels
type Commitment = "processed" | "confirmed" | "finalized";

// Pool status
enum PoolStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  CLOSED = "closed"
}

// Fee information
interface FeeInfo {
  baseFee: number;      // Base fee in basis points
  variableFee: number;  // Variable fee in basis points
  protocolFee: number;  // Protocol fee share
}
```

### Error Types

```typescript
class DLMMError extends Error {
  code: string;
  details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// Common error codes
const ERROR_CODES = {
  INSUFFICIENT_LIQUIDITY: "INSUFFICIENT_LIQUIDITY",
  SLIPPAGE_TOLERANCE_EXCEEDED: "SLIPPAGE_TOLERANCE_EXCEEDED",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  INVALID_PARAMETERS: "INVALID_PARAMETERS",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT"
} as const;
```

---

## 🛠️ Utility Functions

### Address Utilities

```typescript
// Validate pool address
function isValidPoolAddress(address: PublicKey): boolean {
  // Implementation to validate pool address format
}

// Get pool address from token pair
function getPoolAddress(tokenA: PublicKey, tokenB: PublicKey): PublicKey {
  // Implementation to derive pool address
}

// Validate token mint
function isValidTokenMint(mint: PublicKey): boolean {
  // Implementation to validate token mint
}
```

### Math Utilities

```typescript
// Convert amount to smallest units
function toSmallestUnit(amount: number, decimals: number): bigint {
  return BigInt(Math.floor(amount * Math.pow(10, decimals)));
}

// Convert from smallest units
function fromSmallestUnit(amount: bigint, decimals: number): number {
  return Number(amount) / Math.pow(10, decimals);
}

// Calculate price impact
function calculatePriceImpact(
  amountIn: bigint,
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  // Implementation of price impact calculation
}
```

### Network Utilities

```typescript
// Get network-specific constants
function getNetworkConstants(network: string) {
  const constants = {
    "mainnet-beta": {
      programId: new PublicKey("..."),
      feeCollector: new PublicKey("...")
    },
    "devnet": {
      programId: new PublicKey("..."),
      feeCollector: new PublicKey("...")
    }
  };

  return constants[network] || constants["mainnet-beta"];
}
```

---

## 🔄 Method Categories

### Synchronous Methods
- `getQuote()` - Fast quote calculation
- `calculatePriceImpact()` - Price impact estimation
- `validateParams()` - Parameter validation

### Asynchronous Methods
- `swap()` - Token swap execution
- `addLiquidity()` - Liquidity provision
- `removeLiquidity()` - Liquidity removal
- `getPairAccount()` - Pool data retrieval
- `getPositions()` - Position data retrieval

### Batch Methods
- `batchSwap()` - Multiple swaps in one transaction
- `batchAddLiquidity()` - Multiple liquidity additions
- `batchRemoveLiquidity()` - Multiple liquidity removals

---

## 📊 Performance Characteristics

| Method | Avg Response Time | Rate Limit | Batch Support |
|--------|------------------|------------|---------------|
| `getQuote` | 50-200ms | 100 req/s | ✅ |
| `swap` | 2-5s | 10 req/s | ✅ |
| `addLiquidity` | 3-7s | 5 req/s | ✅ |
| `getPairAccount` | 100-500ms | 50 req/s | ❌ |
| `getPositions` | 200-1000ms | 20 req/s | ❌ |

---

## 🚨 Error Handling

### Common Error Patterns

```typescript
// Network errors
try {
  await lbServices.swap(params);
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    // Retry with exponential backoff
    await retryWithBackoff(() => lbServices.swap(params));
  }
}

// Validation errors
try {
  await lbServices.addLiquidity(params);
} catch (error) {
  if (error.code === 'INVALID_PARAMETERS') {
    console.error('Invalid parameters:', error.details);
    // Fix parameters and retry
  }
}

// Timeout errors
try {
  await lbServices.getPositions(userAddress);
} catch (error) {
  if (error.code === 'TIMEOUT') {
    // Use cached data or reduce request scope
    return getCachedPositions(userAddress);
  }
}
```

### Retry Logic

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## 🔗 Related Documentation

- **[Getting Started](../getting-started/index.md)** - SDK setup and basic usage
- **[Core Concepts](../core-concepts/index.md)** - DLMM mechanics and theory
- **[Code Examples](../examples/index.md)** - Working code samples
- **[Troubleshooting](../troubleshooting/index.md)** - Common issues and solutions
- **[Security Guide](../security/index.md)** - Best practices and audits

---

*For the most up-to-date API documentation, check the [GitHub repository](https://github.com/saros-xyz/dlmm-sdk).* 🚀

---

## 🔧 Core Methods

### `swap(params: SwapParams): Promise<SwapResult>`

Execute a token swap through DLMM pools.

#### Parameters

```typescript
interface SwapParams {
  pair: PublicKey;              // Pool address
  amount: bigint;               // Amount to swap (in smallest units)
  slippage: number;             // Max slippage tolerance (0.5 = 0.5%)
  payer: PublicKey;             // Transaction payer
  isExactInput?: boolean;       // true for exact input, false for exact output
  swapForY?: boolean;           // true for X→Y, false for Y→X
  tokenBase?: PublicKey;        // Base token mint (optional)
  tokenQuote?: PublicKey;       // Quote token mint (optional)
  tokenBaseDecimal?: number;    // Base token decimals (optional)
  tokenQuoteDecimal?: number;   // Quote token decimals (optional)
  priorityFee?: number;         // Priority fee in microlamports
  commitment?: Commitment;      // Transaction commitment level
}
```

#### Returns

```typescript
interface SwapResult {
  signature: string;            // Transaction signature
  amountIn: bigint;             // Amount sent
  amountOut: bigint;            // Amount received
  priceImpact: number;          // Price impact percentage
  fee: bigint;                  // Fee amount
  binId: number;                // Active bin ID
}
```

#### Example

```typescript
const result = await lbServices.swap({
  pair: new PublicKey("EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD"),
  amount: BigInt(1000000), // 1 C98
  slippage: 0.5, // 0.5%
  payer: wallet.publicKey,
  isExactInput: true,
  swapForY: true
});

console.log(`Swapped: ${result.signature}`);
console.log(`Received: ${result.amountOut} tokens`);
```

#### Error Handling

```typescript
try {
  const result = await lbServices.swap(params);
} catch (error) {
  if (error.message.includes("Slippage")) {
    console.log("Price slippage exceeded tolerance");
  } else if (error.message.includes("Insufficient")) {
    console.log("Insufficient token balance");
  }
}
```

---

### `getQuote(params: QuoteParams): Promise<QuoteResult>`

Get a swap quote without executing the transaction.

#### Parameters

```typescript
interface QuoteParams {
  pair: PublicKey;              // Pool address
  amount: bigint;               // Amount to swap
  isExactInput: boolean;        // true for exact input, false for exact output
  swapForY: boolean;            // true for X→Y, false for Y→X
  tokenBase: PublicKey;         // Base token mint
  tokenQuote: PublicKey;        // Quote token mint
  tokenBaseDecimal: number;     // Base token decimals
  tokenQuoteDecimal: number;    // Quote token decimals
  slippage: number;             // Slippage tolerance
}
```

#### Returns

```typescript
interface QuoteResult {
  amountOut: bigint;            // Expected output amount
  minOutAmount: bigint;         // Minimum output (after slippage)
  priceImpact: number;          // Price impact percentage
  fee: bigint;                  // Estimated fee
  binId: number;                // Active bin ID
  path: BinPath[];              // Swap execution path
}
```

#### Example

```typescript
const quote = await lbServices.getQuote({
  pair: poolAddress,
  amount: BigInt(1000000),
  isExactInput: true,
  swapForY: true,
  tokenBase: tokenX,
  tokenQuote: tokenY,
  tokenBaseDecimal: 6,
  tokenQuoteDecimal: 6,
  slippage: 0.5
});

console.log(`Expected output: ${quote.amountOut}`);
console.log(`Price impact: ${quote.priceImpact}%`);
```

---

## 💰 Liquidity Methods

### `addLiquidity(params: AddLiquidityParams): Promise<AddLiquidityResult>`

Add liquidity to a DLMM pool.

#### Parameters

```typescript
interface AddLiquidityParams {
  pair: PublicKey;              // Pool address
  amountX: bigint;              // Amount of token X
  amountY: bigint;              // Amount of token Y
  binId: number;                // Target bin ID
  slippage: number;             // Slippage tolerance
  payer: PublicKey;             // Transaction payer
  positionAddress?: PublicKey;  // Existing position (optional)
  otherAmountOffset?: number;   // Amount offset for calculations
}
```

#### Returns

```typescript
interface AddLiquidityResult {
  signature: string;            // Transaction signature
  positionAddress: PublicKey;   // Position address
  amountXAdded: bigint;         // Token X added
  amountYAdded: bigint;         // Token Y added
  binId: number;                // Bin ID
  liquidity: bigint;            // Liquidity added
}
```

#### Example

```typescript
const result = await lbServices.addLiquidity({
  pair: poolAddress,
  amountX: BigInt(10000000), // 10 tokens X
  amountY: BigInt(10000000), // 10 tokens Y
  binId: 100,
  slippage: 0.5,
  payer: wallet.publicKey
});

console.log(`Liquidity added: ${result.signature}`);
console.log(`Position: ${result.positionAddress}`);
```

---

### `removeLiquidity(params: RemoveLiquidityParams): Promise<RemoveLiquidityResult>`

Remove liquidity from a position.

#### Parameters

```typescript
interface RemoveLiquidityParams {
  pair: PublicKey;              // Pool address
  positionAddress: PublicKey;   // Position to remove from
  amount: bigint;               // Amount of liquidity to remove
  binId: number;                // Bin ID
  payer: PublicKey;             // Transaction payer
}
```

#### Returns

```typescript
interface RemoveLiquidityResult {
  signature: string;            // Transaction signature
  amountXRemoved: bigint;       // Token X received
  amountYRemoved: bigint;       // Token Y received
  feeX: bigint;                 // Token X fees claimed
  feeY: bigint;                 // Token Y fees claimed
}
```

#### Example

```typescript
const result = await lbServices.removeLiquidity({
  pair: poolAddress,
  positionAddress: positionPubkey,
  amount: BigInt(5000000), // Remove 50% of liquidity
  binId: 100,
  payer: wallet.publicKey
});

console.log(`Liquidity removed: ${result.signature}`);
console.log(`Received: ${result.amountXRemoved} X + ${result.amountYRemoved} Y`);
```

---

### `claimFees(params: ClaimFeesParams): Promise<ClaimFeesResult>`

Claim accumulated fees from a position.

#### Parameters

```typescript
interface ClaimFeesParams {
  pair: PublicKey;              // Pool address
  positionAddress: PublicKey;   // Position address
  payer: PublicKey;             // Transaction payer
}
```

#### Returns

```typescript
interface ClaimFeesResult {
  signature: string;            // Transaction signature
  feeX: bigint;                 // Token X fees claimed
  feeY: bigint;                 // Token Y fees claimed
}
```

#### Example

```typescript
const result = await lbServices.claimFees({
  pair: poolAddress,
  positionAddress: positionPubkey,
  payer: wallet.publicKey
});

console.log(`Fees claimed: ${result.feeX} X + ${result.feeY} Y`);
```

---

## 📊 Analytics Methods

### `getPairAccount(pairAddress: PublicKey): Promise<PairAccount>`

Get detailed information about a DLMM pool.

#### Parameters

```typescript
pairAddress: PublicKey  // Pool address
```

#### Returns

```typescript
interface PairAccount {
  address: PublicKey;           // Pool address
  tokenX: PublicKey;            // Token X mint
  tokenY: PublicKey;            // Token Y mint
  tokenXDecimal: number;        // Token X decimals
  tokenYDecimal: number;        // Token Y decimals
  price: number;                // Current price
  totalLiquidity: bigint;       // Total liquidity
  activeBinId: number;          // Active bin ID
  binStep: number;              // Bin step
  isActive: boolean;            // Pool status
  volume24h?: bigint;           // 24h volume
  fee24h?: bigint;              // 24h fees
  priceChange24h?: number;      // 24h price change
}
```

#### Example

```typescript
const pool = await lbServices.getPairAccount(poolAddress);

console.log(`Price: $${pool.price}`);
console.log(`Liquidity: ${pool.totalLiquidity}`);
console.log(`Active Bin: ${pool.activeBinId}`);
console.log(`24h Volume: ${pool.volume24h}`);
```

---

### `getUserPositions(params: UserPositionsParams): Promise<LiquidityPosition[]>`

Get all liquidity positions for a user.

#### Parameters

```typescript
interface UserPositionsParams {
  payer: PublicKey;             // User address
  pair?: PublicKey;             // Specific pool (optional)
}
```

#### Returns

```typescript
interface LiquidityPosition {
  positionAddress: PublicKey;   // Position address
  pair: PublicKey;              // Pool address
  lowerBinId: number;           // Lower bin boundary
  upperBinId: number;           // Upper bin boundary
  liquidity: bigint;            // Position liquidity
  feeX: bigint;                 // Accumulated token X fees
  feeY: bigint;                 // Accumulated token Y fees
  lastUpdated: number;          // Last update timestamp
}
```

#### Example

```typescript
const positions = await lbServices.getUserPositions({
  payer: wallet.publicKey,
  pair: poolAddress // Optional: filter by pool
});

positions.forEach((pos, index) => {
  console.log(`${index + 1}. Position: ${pos.positionAddress.toString()}`);
  console.log(`   Liquidity: ${pos.liquidity}`);
  console.log(`   Fees: ${pos.feeX} X + ${pos.feeY} Y`);
});
```

---

### `getBinArrays(pairAddress: PublicKey): Promise<BinArray[]>`

Get bin arrays for a pool.

#### Parameters

```typescript
pairAddress: PublicKey  // Pool address
```

#### Returns

```typescript
interface BinArray {
  index: number;                // Array index
  bins: Bin[];                  // Array of bins
}

interface Bin {
  binId: number;                // Bin ID
  price: number;                // Bin price
  liquidity: bigint;            // Bin liquidity
  amountX: bigint;              // Token X amount
  amountY: bigint;              // Token Y amount
  fee: number;                  // Fee rate
}
```

#### Example

```typescript
const binArrays = await lbServices.getBinArrays(poolAddress);

binArrays.forEach(array => {
  console.log(`Array ${array.index}:`);
  array.bins.forEach(bin => {
    console.log(`  Bin ${bin.binId}: ${bin.liquidity} liquidity`);
  });
});
```

---

## ⚙️ Configuration

### SDK Initialization

```typescript
const lbServices = new LiquidityBookServices({
  cluster: "mainnet-beta",      // Network: "mainnet-beta" | "devnet" | "testnet"
  rpcUrl: "https://...",        // Custom RPC URL (optional)
  commitment: "confirmed",      // Transaction commitment
  timeout: 30000,               // Request timeout (ms)
  priorityFee: 1000             // Default priority fee
});
```

### Network Configuration

```typescript
const NETWORKS = {
  mainnet: {
    cluster: "mainnet-beta",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    commitment: "confirmed"
  },
  devnet: {
    cluster: "devnet",
    rpcUrl: "https://api.devnet.solana.com",
    commitment: "confirmed"
  }
};
```

---

## 📝 Type Definitions

### Enums

```typescript
enum MODE {
  MAINNET = "mainnet-beta",
  DEVNET = "devnet",
  TESTNET = "testnet",
  LOCALNET = "localhost"
}

enum LiquidityShape {
  SPOT = "spot",
  CURVE = "curve",
  BID_ASK = "bidAsk",
  UNIFORM = "uniform"
}

enum Commitment {
  PROCESSED = "processed",
  CONFIRMED = "confirmed",
  FINALIZED = "finalized"
}
```

### Common Interfaces

```typescript
interface TokenInfo {
  mint: PublicKey;
  decimals: number;
  symbol: string;
  name: string;
}

interface PoolInfo {
  address: PublicKey;
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  binStep: number;
  isActive: boolean;
}

interface SwapConfig {
  maxSlippage: number;
  deadline: number;
  priorityFee: number;
  commitment: Commitment;
}
```

---

## 🛠️ Utility Methods

### `calculateBinPrice(binId: number, binStep: number): number`

Calculate the price for a given bin ID.

```typescript
const price = lbServices.calculateBinPrice(100, 10);
// Result: 1.5 (for bin step 10)
```

### `calculateBinId(price: number, binStep: number): number`

Calculate the bin ID for a given price.

```typescript
const binId = lbServices.calculateBinId(1.5, 10);
// Result: 100
```

### `getTokenBalance(owner: PublicKey, mint: PublicKey): Promise<bigint>`

Get token balance for a wallet.

```typescript
const balance = await lbServices.getTokenBalance(wallet.publicKey, tokenMint);
console.log(`Balance: ${balance}`);
```

### `formatAmount(amount: bigint, decimals: number): string`

Format amount with proper decimals.

```typescript
const formatted = lbServices.formatAmount(BigInt(1000000), 6);
// Result: "1.000000"
```

---

## 🔄 Batch Operations

### `batchSwap(params: BatchSwapParams): Promise<BatchSwapResult>`

Execute multiple swaps in a single transaction.

```typescript
interface BatchSwapParams {
  swaps: SwapParams[];
  payer: PublicKey;
}

const result = await lbServices.batchSwap({
  swaps: [swap1, swap2, swap3],
  payer: wallet.publicKey
});
```

### `batchLiquidity(params: BatchLiquidityParams): Promise<BatchLiquidityResult>`

Execute multiple liquidity operations in a single transaction.

```typescript
interface BatchLiquidityParams {
  operations: LiquidityOperation[];
  payer: PublicKey;
}

const result = await lbServices.batchLiquidity({
  operations: [addOp1, removeOp2, claimOp3],
  payer: wallet.publicKey
});
```

---

## 📊 Advanced Analytics

### `getPoolStats(pairAddress: PublicKey): Promise<PoolStats>`

Get comprehensive pool statistics.

```typescript
interface PoolStats {
  volume24h: bigint;
  volume7d: bigint;
  fee24h: bigint;
  fee7d: bigint;
  tvl: bigint;
  apr: number;
  utilization: number;
}

const stats = await lbServices.getPoolStats(poolAddress);
console.log(`TVL: $${stats.tvl}`);
console.log(`APR: ${stats.apr}%`);
```

### `getPositionValue(positionAddress: PublicKey): Promise<PositionValue>`

Calculate the current value of a position.

```typescript
interface PositionValue {
  tokenXValue: bigint;
  tokenYValue: bigint;
  totalValue: bigint;
  unrealizedPnL: bigint;
  feesEarned: bigint;
}

const value = await lbServices.getPositionValue(positionAddress);
console.log(`Total Value: $${value.totalValue}`);
```

---

## 🚨 Error Handling

### Common Error Types

```typescript
class DLMMError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "DLMMError";
  }
}

// Error codes
const ERROR_CODES = {
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  SLIPPAGE_EXCEEDED: "SLIPPAGE_EXCEEDED",
  POOL_INACTIVE: "POOL_INACTIVE",
  INVALID_PARAMS: "INVALID_PARAMS",
  NETWORK_ERROR: "NETWORK_ERROR"
};
```

### Error Handling Patterns

```typescript
// Pattern 1: Try-catch with specific handling
try {
  const result = await lbServices.swap(params);
} catch (error) {
  switch (error.code) {
    case "INSUFFICIENT_BALANCE":
      console.log("Deposit more tokens");
      break;
    case "SLIPPAGE_EXCEEDED":
      console.log("Increase slippage tolerance");
      break;
    default:
      console.error("Unknown error:", error);
  }
}

// Pattern 2: Validation before execution
function validateSwap(params: SwapParams): string[] {
  const errors: string[] = [];

  if (params.amount <= 0) {
    errors.push("Amount must be positive");
  }

  if (params.slippage < 0 || params.slippage > 1) {
    errors.push("Slippage must be between 0 and 1");
  }

  return errors;
}

const errors = validateSwap(params);
if (errors.length > 0) {
  throw new Error(`Validation failed: ${errors.join(", ")}`);
}
```

---

## 🔧 Advanced Configuration

### Custom RPC Configuration

```typescript
const customConfig = {
  cluster: "mainnet-beta",
  rpcUrl: "https://your-custom-rpc.com",
  wsUrl: "wss://your-custom-rpc.com/ws",
  commitment: "confirmed" as Commitment,
  timeout: 30000,
  priorityFee: 1000,
  maxRetries: 3
};

const lbServices = new LiquidityBookServices(customConfig);
```

### Transaction Optimization

```typescript
const optimizedConfig = {
  // Network optimization
  commitment: "confirmed",
  skipPreflight: false,

  // Fee optimization
  priorityFee: 1000,  // microlamports
  computeUnitLimit: 200000,

  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000
};
```

---

## 📈 Performance Considerations

### Optimizing for Speed

```typescript
// 1. Use batch operations
const batchResult = await lbServices.batchSwap({
  swaps: multipleSwaps,
  payer: wallet.publicKey
});

// 2. Set appropriate commitment level
const fastConfig = {
  commitment: "processed",  // Faster but less reliable
  priorityFee: 5000        // Higher fee for faster processing
};

// 3. Cache frequently used data
const poolCache = new Map();
async function getCachedPool(address: PublicKey) {
  if (!poolCache.has(address.toString())) {
    const pool = await lbServices.getPairAccount(address);
    poolCache.set(address.toString(), pool);
  }
  return poolCache.get(address.toString());
}
```

### Memory Optimization

```typescript
// 1. Limit concurrent operations
const semaphore = new Semaphore(5); // Max 5 concurrent operations

async function limitedOperation(params: any) {
  return await semaphore.acquire(async () => {
    return await lbServices.swap(params);
  });
}

// 2. Clean up event listeners
class CleanupManager {
  private listeners: (() => void)[] = [];

  addListener(listener: () => void) {
    this.listeners.push(listener);
  }

  cleanup() {
    this.listeners.forEach(cleanup => cleanup());
    this.listeners = [];
  }
}
```

---

## 🔗 Integration Examples

### React Hook Integration

```typescript
import { useState, useCallback } from "react";
import { LiquidityBookServices } from "@saros-finance/dlmm-sdk";

export function useDLMMSwap() {
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);

  const getQuote = useCallback(async (params) => {
    setLoading(true);
    setError(null);

    try {
      const result = await lbServices.getQuote(params);
      setQuote(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const executeSwap = useCallback(async (params) => {
    setLoading(true);
    setError(null);

    try {
      const result = await lbServices.swap(params);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, quote, error, getQuote, executeSwap };
}
```

### Express.js API Integration

```typescript
import express from "express";
import { LiquidityBookServices } from "@saros-finance/dlmm-sdk";

const app = express();
const lbServices = new LiquidityBookServices({ cluster: "mainnet-beta" });

app.post("/api/swap", async (req, res) => {
  try {
    const { pair, amount, slippage, userPublicKey } = req.body;

    // Validate input
    if (!pair || !amount || !userPublicKey) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Get quote
    const quote = await lbServices.getQuote({
      pair: new PublicKey(pair),
      amount: BigInt(amount),
      slippage: slippage || 0.5,
      // ... other params
    });

    // Execute swap
    const result = await lbServices.swap({
      ...quote,
      payer: new PublicKey(userPublicKey)
    });

    res.json({
      success: true,
      data: result,
      quote
    });

  } catch (error) {
    console.error("Swap API error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log("DLMM API server running on port 3000");
});
```

---

## 📚 Additional Resources

- **[Getting Started](../getting-started/index.md)** - Quick start guide
- **[Core Concepts](../core-concepts/index.md)** - DLMM fundamentals
- **[Examples](../examples/index.md)** - Working code samples
- **[Troubleshooting](../troubleshooting/index.md)** - Debug common issues
- **[Security](../security/index.md)** - Best practices and audits

## 💬 Support

- **📖 Documentation**: You're reading it!
- **💬 Discord**: [discord.gg/saros](https://discord.gg/saros)
- **🐛 GitHub Issues**: [Report bugs](https://github.com/saros-xyz/dlmm-sdk/issues)
- **📧 Email**: support@saros.finance

---

**🎯 Ready to build?** Check out the [Getting Started](../getting-started/index.md) guide to begin your DLMM journey!
```

**Returns:**
```typescript
interface GetTokenOutputResponse {
  amountIn: bigint;           // Input amount
  amountOut: bigint;          // Output amount
  priceImpact: number;        // Price impact percentage
  amount: bigint;             // Final amount for transaction
  otherAmountOffset: bigint;  // Amount offset for slippage
}
```

**Example:**
```typescript
const quote = await lbServices.getQuote({
  amount: BigInt(1000000),     // 1 token
  isExactInput: true,
  swapForY: true,
  pair: poolAddress,
  tokenBase: tokenXMint,
  tokenQuote: tokenYMint,
  tokenBaseDecimal: 6,
  tokenQuoteDecimal: 6,
  slippage: 0.5
});
```

#### `swap(params: SwapParams): Promise<Transaction>`

Creates a swap transaction.

**Parameters:**
```typescript
interface SwapParams {
  amount: bigint;             // Swap amount
  tokenMintX: PublicKey;      // Token X mint
  tokenMintY: PublicKey;      // Token Y mint
  otherAmountOffset: bigint;  // Amount offset from quote
  swapForY: boolean;          // Swap direction
  isExactInput: boolean;      // Exact input or output
  pair: PublicKey;            // Pool address
  payer: PublicKey;           // User wallet address
  hook?: PublicKey;           // Optional hook address
}
```

**Returns:** `Promise<Transaction>` - Signed transaction ready for submission

**Example:**
```typescript
const swapTx = await lbServices.swap({
  amount: quote.amount,
  tokenMintX: tokenXMint,
  tokenMintY: tokenYMint,
  otherAmountOffset: quote.otherAmountOffset,
  swapForY: true,
  isExactInput: true,
  pair: poolAddress,
  payer: userWallet.publicKey,
  hook: lbServices.hooksConfig
});
```

#### `createPairWithConfig(params: CreatePairWithConfigParams): Promise<{tx: Transaction, pair: PublicKey}>`

Creates a new liquidity pool.

**Parameters:**
```typescript
interface CreatePairWithConfigParams {
  tokenBase: {
    mintAddress: string;
    decimal: number;
  };
  tokenQuote: {
    mintAddress: string;
    decimal: number;
  };
  ratePrice: number;          // Initial price ratio
  binStep: number;            // Bin step size
  payer: PublicKey;           // Creator wallet
}
```

**Returns:**
```typescript
{
  tx: Transaction;        // Creation transaction
  pair: PublicKey;        // New pool address
}
```

**Example:**
```typescript
const { tx, pair } = await lbServices.createPairWithConfig({
  tokenBase: {
    mintAddress: "C98_MINT_ADDRESS",
    decimal: 6
  },
  tokenQuote: {
    mintAddress: "USDC_MINT_ADDRESS",
    decimal: 6
  },
  ratePrice: 1,           // 1:1 initial ratio
  binStep: 10,            // 0.1% bin step
  payer: userWallet.publicKey
});
```

#### `createPosition(params: CreatePositionParams): Promise<{position: string}>`

Creates a new liquidity position.

**Parameters:**
```typescript
interface CreatePositionParams {
  payer: PublicKey;           // User wallet
  relativeBinIdLeft: number;  // Lower bin relative to active
  relativeBinIdRight: number; // Upper bin relative to active
  pair: PublicKey;            // Pool address
  binArrayIndex: number;      // Bin array index
  positionMint: PublicKey;    // Position NFT mint
  transaction: Transaction;   // Transaction to add to
}
```

**Returns:**
```typescript
{
  position: string;  // Position account address
}
```

#### `addLiquidityIntoPosition(params: AddLiquidityIntoPositionParams): Promise<{tx: Transaction}>`

Adds liquidity to an existing position.

**Parameters:**
```typescript
interface AddLiquidityIntoPositionParams {
  positionMint: PublicKey;        // Position NFT mint
  payer: PublicKey;               // User wallet
  pair: PublicKey;                // Pool address
  binArrayLower: PublicKey;       // Lower bin array
  binArrayUpper: PublicKey;       // Upper bin array
  transaction: Transaction;       // Transaction to modify
  liquidityDistribution: Distribution; // Liquidity distribution
  amountX: bigint;                // Token X amount
  amountY: bigint;                // Token Y amount
}
```

**Returns:**
```typescript
{
  tx: Transaction;  // Modified transaction
}
```

#### `removeMultipleLiquidity(params: RemoveMultipleLiquidityParams): Promise<{tx: Transaction}>`

Removes liquidity from positions.

**Parameters:**
```typescript
interface RemoveMultipleLiquidityParams {
  pair: PublicKey;                    // Pool address
  positions: PositionInfo[];          // Positions to remove from
  binRange: [number, number];         // Bin range [lower, upper]
  removeLiquidityType: RemoveLiquidityType; // Removal type
  payer: PublicKey;                   // User wallet
}
```

**Returns:**
```typescript
{
  tx: Transaction;  // Removal transaction
}
```

### Query Methods

#### `getPairAccount(pair: PublicKey): Promise<Pair>`

Gets pool account information.

**Parameters:**
- `pair: PublicKey` - Pool address

**Returns:** `Promise<Pair>` - Pool account data

#### `getPositionAccount(position: PublicKey): Promise<PositionInfo>`

Gets position account information.

**Parameters:**
- `position: PublicKey` - Position address

**Returns:** `Promise<PositionInfo>` - Position account data

#### `getUserPositions(params: UserPositionsParams): Promise<PositionInfo[]>`

Gets all positions for a user in a pool.

**Parameters:**
```typescript
interface UserPositionsParams {
  payer: PublicKey;     // User wallet
  pair: PublicKey;      // Pool address (optional)
}
```

**Returns:** `Promise<PositionInfo[]>` - Array of user positions

#### `getBinArrayInfo(params: GetBinsArrayInfoParams): Promise<{bins: Bin[], resultIndex: number}>`

Gets bin array information.

**Parameters:**
```typescript
interface GetBinsArrayInfoParams {
  binArrayIndex: number;  // Bin array index
  pair: PublicKey;        // Pool address
  payer?: PublicKey;      // User wallet (optional)
}
```

**Returns:**
```typescript
{
  bins: Bin[];       // Array of bins
  resultIndex: number; // Result index
}
```

#### `fetchPoolAddresses(): Promise<string[]>`

Fetches all pool addresses on the network.

**Returns:** `Promise<string[]>` - Array of pool addresses

#### `fetchPoolMetadata(poolAddress: string): Promise<PoolMetadata>`

Fetches metadata for a specific pool.

**Parameters:**
- `poolAddress: string` - Pool address

**Returns:** `Promise<PoolMetadata>` - Pool metadata

### Utility Methods

#### `getDexName(): string`

Gets the DEX name.

**Returns:** `string` - "Saros DLMM"

#### `getDexProgramId(): string`

Gets the DEX program ID.

**Returns:** `string` - Program ID as string

#### `listenNewPoolAddress(callback: (poolAddress: string) => void): Promise<void>`

Listens for new pool creation events.

**Parameters:**
- `callback: (poolAddress: string) => void` - Callback function

## Types

### Core Types

#### `ILiquidityBookConfig`

```typescript
interface ILiquidityBookConfig {
  mode: MODE;  // Network mode
}
```

#### `MODE`

```typescript
enum MODE {
  MAINNET = "mainnet",
  DEVNET = "devnet",
  TESTNET = "testnet"
}
```

#### `LiquidityShape`

```typescript
enum LiquidityShape {
  Spot = "Spot",      // Concentrated around current price
  Curve = "Curve",    // Curved distribution
  BidAsk = "BidAsk"   // Bid/ask distribution
}
```

#### `RemoveLiquidityType`

```typescript
enum RemoveLiquidityType {
  Both = "removeBoth",           // Remove both tokens
  BaseToken = "removeBaseToken", // Remove only base token
  QuoteToken = "removeQuoteToken" // Remove only quote token
}
```

### Data Types

#### `Pair`

```typescript
interface Pair {
  bump: number[];
  liquidityBookConfig: string;
  binStep: number;
  binStepSeed: number[];
  tokenMintX: string;
  tokenMintY: string;
  staticFeeParameters: {
    baseFactor: number;
    filterPeriod: number;
    decayPeriod: number;
    reductionFactor: number;
    variableFeeControl: number;
    maxVolatilityAccumulator: number;
    protocolShare: number;
    space: [number, number];
  };
  activeId: number;
  dynamicFeeParameters: {
    timeLastUpdated: BN;
    volatilityAccumulator: number;
    volatilityReference: number;
    idReference: number;
    space: [number, number, number, number];
  };
  protocolFeesX: string;
  protocolFeesY: string;
  hook: null | string;
}
```

#### `PositionInfo`

```typescript
interface PositionInfo {
  pair: string;
  positionMint: string;
  position: string;
  liquidityShares: string[];
  lowerBinId: number;
  upperBinId: number;
  space: number[];
}
```

#### `Bin`

```typescript
interface Bin {
  totalSupply: string;
  reserveX: string;
  reserveY: string;
}
```

## Utilities

### Price Utilities

#### `getPriceFromId(binId: number, binStep: number): number`

Converts bin ID to price.

**Parameters:**
- `binId: number` - Bin ID
- `binStep: number` - Bin step

**Returns:** `number` - Price value

#### `getIdFromPrice(price: number, binStep: number): number`

Converts price to bin ID.

**Parameters:**
- `price: number` - Price value
- `binStep: number` - Bin step

**Returns:** `number` - Bin ID

### Math Utilities

#### `mulDiv(a: number, b: number, c: number, rounding: string): number`

Performs multiplication and division with rounding.

**Parameters:**
- `a: number` - First number
- `b: number` - Second number
- `c: number` - Divisor
- `rounding: string` - Rounding mode ("up", "down", "nearest")

**Returns:** `number` - Result

#### `mulShr(a: number, b: number, shift: number): number`

Multiplies and right shifts.

**Parameters:**
- `a: number` - First number
- `b: number` - Second number
- `shift: number` - Shift amount

**Returns:** `number` - Result

#### `shrDiv(a: number, b: number, shift: number): number`

Right shifts and divides.

**Parameters:**
- `a: number` - Dividend
- `b: number` - Divisor
- `shift: number` - Shift amount

**Returns:** `number` - Result

### Distribution Utilities

#### `createUniformDistribution(params: CreateLiquidityDistributionParams): Distribution`

Creates a uniform liquidity distribution.

**Parameters:**
```typescript
interface CreateLiquidityDistributionParams {
  shape: LiquidityShape;
  binRange: [number, number];
}
```

**Returns:** `Distribution` - Liquidity distribution

#### `getBinRange(activeBin: number, binRange: [number, number]): [number, number]`

Calculates bin range from active bin.

**Parameters:**
- `activeBin: number` - Active bin ID
- `binRange: [number, number]` - Relative bin range

**Returns:** `[number, number]` - Absolute bin range

#### `getMaxBinArray(binRange: [number, number], activeBin: number): PublicKey[]`

Gets maximum bin arrays for a range.

**Parameters:**
- `binRange: [number, number]` - Bin range
- `activeBin: number` - Active bin

**Returns:** `PublicKey[]` - Bin array addresses

#### `getMaxPosition(binRange: [number, number], activeBin: number): number[]`

Gets maximum positions for a range.

**Parameters:**
- `binRange: [number, number]` - Bin range
- `activeBin: number` - Active bin

**Returns:** `number[]` - Position indices

## Constants

### Network Configuration

```typescript
const CONFIG = {
  [MODE.TESTNET]: {
    rpc: "https://api.testnet.solana.com",
  },
  [MODE.DEVNET]: {
    rpc: "https://api.devnet.solana.com",
  },
  [MODE.MAINNET]: {
    rpc: "https://api.mainnet-beta.solana.com",
  },
};
```

### Bin Configuration

```typescript
const BIN_STEP_CONFIGS = [
  {
    binStep: 1,
    feeParameters: {
      baseFactor: 10000,
      filterPeriod: 10,
      decayPeriod: 120,
      reductionFactor: 5000,
      variableFeeControl: 2000000,
      maxVolatilityAccumulator: 100000,
      protocolShare: 2000,
      space: [0, 0],
    },
  },
  // ... more configurations
];
```

### System Constants

```typescript
const BIN_ARRAY_SIZE = 256;
const BIN_ARRAY_INDEX = ACTIVE_ID / BIN_ARRAY_SIZE - 1;
const MAX_BASIS_POINTS = 10_000;
const PRECISION = 1_000_000_000;
const SCALE_OFFSET = 64;
const UNIT_PRICE_DEFAULT = 1_000_000;
const WRAP_SOL_ADDRESS = "So11111111111111111111111111111111111111112";
```

## Error Handling

All methods throw errors that should be caught:

```typescript
try {
  const result = await lbServices.getQuote(params);
} catch (error) {
  console.error("Error:", error.message);
  // Handle specific error types
}
```

Common error types:
- `SlippageError` - Slippage tolerance exceeded
- `InsufficientFundsError` - Insufficient token balance
- `InvalidParametersError` - Invalid input parameters
- `NetworkError` - Network connectivity issues

---

**Need help? Check our [Examples](../examples/index.md) or [Guides](../guides/index.md) for detailed usage patterns.**</content>
<parameter name="filePath">h:\Rahul Prasad 01\earn\Saros\docs\api-reference\index.md
