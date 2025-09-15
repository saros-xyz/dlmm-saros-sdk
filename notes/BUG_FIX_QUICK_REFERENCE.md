# 🛠️ BUG FIX QUICK REFERENCE GUIDE

**Date:** September 9, 2025  
**Purpose:** Quick reference for implementing critical bug fixes  
**Status:** Ready for implementation  

---

## 🚨 BUG-001: Fix ONE Constant (CRITICAL - Do First)

### Current Code (WRONG)
```typescript
// constants/config.ts:35
export const ONE = 1 << SCALE_OFFSET;
```

### Fixed Code (CORRECT)
```typescript
// constants/config.ts:35
export const ONE = 2n ** 64n;
```

### Verification
```bash
npm test -- tests/unit/constants-bug.test.ts
# Should show: ONE = 18446744073709551616n (not 1)
```

---

## 🟠 BUG-002: Fix Price Calculations (MAJOR - Do Second)

### Current Code (WRONG)
```typescript
// utils/price.ts:3-16
const getBase = (binStep: number) => {
  const quotient = binStep << SCALE_OFFSET
  const basisPointMaxBigInt = BASIS_POINT_MAX

  //@ts-ignore
  if (basisPointMaxBigInt === 0) return null
  const fraction = quotient / basisPointMaxBigInt

  const oneBigInt = ONE
  const result = oneBigInt + fraction

  return result
}
```

### Fixed Code (CORRECT)
```typescript
// utils/price.ts:3-16
const getBase = (binStep: number): bigint | null => {
  const quotient = BigInt(binStep) << BigInt(SCALE_OFFSET)
  const basisPointMaxBigInt = BigInt(BASIS_POINT_MAX)

  if (basisPointMaxBigInt === 0n) return null

  const fraction = quotient / basisPointMaxBigInt
  const oneBigInt = ONE
  const result = oneBigInt + fraction

  return result
}
```

### Verification
```bash
npm test -- tests/unit/price-bug.test.ts
# Should pass all tests
```

---

## 🟡 BUG-003: Remove @ts-ignore (MINOR - Do Third)

### Pattern to Fix
```typescript
// BEFORE
public async getPairAccount(pair: PublicKey) {
  //@ts-ignore
  return await this.lbProgram.account.pair.fetch(pair);
}

// AFTER
public async getPairAccount(pair: PublicKey) {
  return await this.lbProgram.account.pair.fetch(pair);
}
```

### Locations to Fix
- `services/core.ts:73` - `getPairAccount()`
- `services/core.ts:78` - `getPositionAccount()`
- `services/core.ts:119` - `getBinArray()`
- `services/core.ts:127` - `getBinArray()`
- `services/core.ts:137` - `getBinArray()`
- `services/core.ts:1280` - `fetchPoolMetadata()`

---

## 🟡 BUG-004: Fix Balance Validation (MINOR - Do Fourth)

### Current Code (WRONG)
```typescript
// services/core.ts:1298-1306
const [baseReserve, quoteReserve] = await Promise.all([
  connection.getTokenAccountBalance(basePairVault).catch(() => ({
    value: { uiAmount: 0, amount: "0", decimals: 0, uiAmountString: "0" },
  })),
  connection.getTokenAccountBalance(quotePairVault).catch(() => ({
    value: { uiAmount: 0, amount: "0", decimals: 0, uiAmountString: "0" },
  })),
]);
```

### Fixed Code (CORRECT)
```typescript
// services/core.ts:1298-1306
const [baseReserve, quoteReserve] = await Promise.all([
  connection.getTokenAccountBalance(basePairVault),
  connection.getTokenAccountBalance(quotePairVault),
]);

// Handle errors properly in calling code
```

### Verification
```bash
npm test -- tests/unit/sol-balance-bypass.test.ts
# Should demonstrate proper error handling
```

---

## 🧪 TESTING CHECKLIST

### After Each Fix
- [ ] Run specific bug test
- [ ] Run full test suite: `npm test`
- [ ] Run integration tests: `npm run test:integration`
- [ ] Check for TypeScript errors: `npx tsc --noEmit`

### Final Validation
- [ ] All bug tests pass
- [ ] No TypeScript errors
- [ ] Integration tests pass
- [ ] Performance tests pass

---

## 🚨 DEPLOYMENT NOTES

### Critical Deployment Order
1. **BUG-001** - Deploy immediately (critical financial impact)
2. **BUG-002** - Deploy after testing (major functionality impact)
3. **BUG-003** - Deploy in maintenance window (code quality)
4. **BUG-004** - Deploy in maintenance window (error handling)

### Rollback Plan
- Keep backup of original files
- Have revert commits ready
- Test rollback procedure

---

## 📞 SUPPORT

**For questions about these fixes:**
1. Refer to full report: `notes/CRITICAL_BUG_REPORT_SECURITY_AUDIT.md`
2. Check test files for examples
3. Contact security team for clarification

---

*This guide provides the essential fixes. Always test thoroughly before deploying.*
