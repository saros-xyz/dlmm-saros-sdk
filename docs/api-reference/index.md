# API Reference

Complete API documentation for the Saros DLMM SDK.

## Table of Contents

- [LiquidityBookServices](#liquiditybookservices)
- [Types](#types)
- [Utilities](#utilities)
- [Constants](#constants)

## LiquidityBookServices

The main service class for interacting with Saros DLMM.

### Constructor

```typescript
new LiquidityBookServices(config: ILiquidityBookConfig)
```

**Parameters:**
- `config.mode` - Network mode (`MODE.MAINNET`, `MODE.DEVNET`, `MODE.TESTNET`)

**Example:**
```typescript
const lbServices = new LiquidityBookServices({
  mode: MODE.MAINNET
});
```

### Core Methods

#### `getQuote(params: GetTokenOutputParams): Promise<GetTokenOutputResponse>`

Gets a quote for a token swap operation.

**Parameters:**
```typescript
interface GetTokenOutputParams {
  amount: bigint;              // Amount to swap
  isExactInput: boolean;       // Whether amount is input (true) or output (false)
  swapForY: boolean;           // Swap direction (X->Y or Y->X)
  pair: PublicKey;             // Pool address
  tokenBase: PublicKey;        // Base token mint
  tokenQuote: PublicKey;       // Quote token mint
  tokenBaseDecimal: number;    // Base token decimals
  tokenQuoteDecimal: number;   // Quote token decimals
  slippage: number;            // Slippage tolerance (percentage)
}
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

**Need help? Check our [Examples](../examples/) or [Guides](../guides/) for detailed usage patterns.**</content>
<parameter name="filePath">h:\Rahul Prasad 01\earn\Saros\docs\api-reference\index.md
