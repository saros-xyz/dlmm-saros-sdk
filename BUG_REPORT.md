# DLMM Saros SDK - Comprehensive Bug Report & Security Audit

## Executive Summary

A comprehensive security audit of the Saros DLMM SDK has identified several critical and major bugs that could lead to incorrect calculations, runtime errors, and security vulnerabilities. This report documents all findings with reproduction steps, impact assessment, and recommended fixes.

## Critical Bugs

### 1. CRITICAL: Integer Overflow in ONE Constant
**Location:** `constants/config.ts:35`
**Severity:** CRITICAL
**Impact:** All price calculations using the ONE constant will be completely incorrect

#### Bug Description
```typescript
export const SCALE_OFFSET = 64;
export const ONE = 1 << SCALE_OFFSET; // BUG: 1 << 64 overflows to 1
```

In JavaScript, bitwise operations are performed on 32-bit integers. `1 << 64` becomes `1 << (64 % 32) = 1 << 0 = 1`, which is completely wrong.

#### Expected Behavior
```typescript
export const ONE = BigInt(1) << BigInt(SCALE_OFFSET); // 2^64
// or
export const ONE = 2n ** 64n; // 2^64
```

#### Impact
- All price calculations in `utils/price.ts` are wrong
- Any calculation expecting 2^64 will get 1 instead
- This affects core DeFi functionality

#### Test Case
See `tests/unit/constants-bug.test.ts`

---

### 2. MAJOR: BigInt/Number Type Mixing in Price Calculations
**Location:** `utils/price.ts:3-16`
**Severity:** MAJOR
**Impact:** Runtime errors and incorrect price calculations

#### Bug Description
```typescript
const getBase = (binStep: number) => {
  const quotient = binStep << SCALE_OFFSET; // Already overflowed
  const basisPointMaxBigInt = BASIS_POINT_MAX; // number

  //@ts-ignore // BUG: Suppressing type error
  if (basisPointMaxBigInt === 0) return null
  const fraction = quotient / basisPointMaxBigInt // number / number (wrong types)

  const oneBigInt = ONE // Should be BigInt but is number due to overflow
  const result = oneBigInt + fraction // number + number (inconsistent)

  return result
}
```

#### Issues
1. `ONE` constant overflow (see bug #1)
2. Inconsistent type usage with @ts-ignore suppression
3. Mixed BigInt/number operations without proper conversion

#### Impact
- Price calculations may fail at runtime
- @ts-ignore hides type safety violations
- Incorrect base price calculations affect all trading operations

#### Test Case
See `tests/unit/price-bug.test.ts`

---

### 3. MINOR: Multiple @ts-ignore Violations
**Location:** `services/core.ts` (8 instances)
**Severity:** MINOR
**Impact:** Hidden type safety issues

#### Affected Methods
- `getPairAccount()` - Line 73
- `getPositionAccount()` - Line 78
- `getBinArray()` - Lines 119, 127, 137
- `fetchPoolMetadata()` - Line 1280
- Other locations

#### Bug Description
```typescript
public async getPairAccount(pair: PublicKey) {
  //@ts-ignore // BUG: Suppressing type checking
  return await this.lbProgram.account.pair.fetch(pair);
}
```

#### Impact
- Type errors are hidden from developers
- Could mask real type safety issues
- Reduces code maintainability

---

### 4. MINOR: SOL Balance Validation Bypass
**Location:** `services/core.ts:1298-1306`
**Severity:** MINOR
**Impact:** Silent failure handling could mask real issues

#### Bug Description
```typescript
const [baseReserve, quoteReserve] = await Promise.all([
  connection.getTokenAccountBalance(basePairVault).catch(() => ({
    value: {
      uiAmount: 0,
      amount: "0",
      decimals: 0,
      uiAmountString: "0",
    },
  })),
  // Same for quoteReserve
]);
```

#### Issues
- Uses `.catch()` to return default values instead of proper error handling
- Could mask real balance checking failures
- No logging or alerting when balance checks fail

#### Impact
- Failed balance validations are silently ignored
- Could hide real connectivity or account issues
- May provide incorrect pool metadata

#### Test Case
See `tests/unit/sol-balance-bypass.test.ts`

---

## Test Coverage Analysis

### Existing Tests Status
- **Math Tests:** ✅ PASSING but may expect incorrect behavior
- **Type Safety Tests:** 📝 DOCUMENT bugs but don't prevent them
- **Security Tests:** 🔍 DETECT some issues but incomplete coverage

### Missing Test Coverage
1. **ONE Constant Overflow:** No existing test
2. **Price Calculation Type Safety:** Partial coverage
3. **SOL Balance Validation:** No test for bypass behavior
4. **Hook Implementation Completeness:** Needs verification

---

## Recommended Fixes

### Priority 1: Fix ONE Constant (CRITICAL)
```typescript
// constants/config.ts
export const ONE = 2n ** 64n; // Use BigInt
// or
export const ONE = BigInt(1) << BigInt(SCALE_OFFSET);
```

### Priority 2: Fix Price Calculations (MAJOR)
```typescript
// utils/price.ts
const getBase = (binStep: number): bigint | null => {
  const quotient = BigInt(binStep) << BigInt(SCALE_OFFSET);
  const basisPointMaxBigInt = BigInt(BASIS_POINT_MAX);

  if (basisPointMaxBigInt === 0n) return null;

  const fraction = quotient / basisPointMaxBigInt;
  const oneBigInt = ONE; // Now properly BigInt
  const result = oneBigInt + fraction;

  return result;
}
```

### Priority 3: Remove @ts-ignore and Fix Types (MINOR)
- Investigate each @ts-ignore usage
- Either fix the underlying type issue or add proper type assertions
- Improve Anchor program type definitions

### Priority 4: Improve Error Handling (MINOR)
```typescript
// services/core.ts
try {
  const balance = await connection.getTokenAccountBalance(vault);
  return balance;
} catch (error) {
  console.error(`Failed to get balance for vault ${vault.toString()}:`, error);
  throw new Error(`Balance check failed: ${error.message}`);
}
```

---

## Security Implications

1. **Financial Loss:** Incorrect price calculations could lead to wrong trade executions
2. **Runtime Failures:** Type mixing could cause unexpected crashes
3. **Silent Failures:** Balance validation bypass could hide real issues
4. **Maintainability:** @ts-ignore usage reduces code quality

---

## Next Steps

1. **Immediate:** Fix the ONE constant overflow (critical)
2. **Short-term:** Fix price calculation type safety
3. **Medium-term:** Remove all @ts-ignore violations
4. **Long-term:** Add comprehensive test coverage for all edge cases

---

## Files Modified/Created for Testing
- `tests/unit/constants-bug.test.ts` - Tests for ONE constant overflow
- `tests/unit/price-bug.test.ts` - Tests for price calculation bugs
- `tests/unit/sol-balance-bypass.test.ts` - Tests for balance validation bypass

Run these tests with:
```bash
npm test -- tests/unit/*bug*.test.ts
```
