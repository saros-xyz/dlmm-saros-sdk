# Contributing to Saros DLMM SDK

Welcome! We're excited that you're interested in contributing to the Saros DLMM SDK. This guide will help you get started with development, testing, and contributing to our project.

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have:
- **Node.js**: v18.0.0 or higher
- **pnpm**: v8.0.0 or higher
- **Rust**: v1.70.0 or higher (for Solana program development)
- **Solana CLI**: Latest stable version
- **Git**: Latest version

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/saros-finance/dlmm-sdk.git
cd dlmm-sdk

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Build the project
pnpm build

# Run tests
pnpm test
```

## 🏗️ Development Workflow

### 1. Choose an Issue
- Check [GitHub Issues](https://github.com/saros-finance/dlmm-sdk/issues) for open tasks
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to indicate you're working on it

### 2. Create a Branch
```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Changes
- Follow our [coding standards](#coding-standards)
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass

### 4. Test Your Changes
```bash
# Run unit tests
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run all tests
pnpm test

# Run linting
pnpm lint

# Check TypeScript types
pnpm type-check
```

### 5. Commit Your Changes
```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add new feature description

- What was changed
- Why it was changed
- How it was tested"
```

### 6. Create a Pull Request
- Push your branch to GitHub
- Create a pull request with a clear description
- Reference any related issues
- Request review from maintainers

## 📝 Coding Standards

### TypeScript/JavaScript

#### File Structure
```
src/
├── core/           # Core business logic
├── services/       # Service layer
├── types/          # TypeScript definitions
├── utils/          # Utility functions
├── constants/      # Constants and configurations
└── index.ts        # Main exports
```

#### Naming Conventions
```typescript
// Classes: PascalCase
class LiquidityBookServices { }

// Interfaces: PascalCase with I prefix
interface ISwapParams { }

// Types: PascalCase
type SwapResult = { };

// Functions: camelCase
function calculateSwapAmount() { }

// Constants: SCREAMING_SNAKE_CASE
const MAX_SWAP_AMOUNT = 1000000;

// Variables: camelCase
const swapAmount = 1000;
```

#### Code Style
```typescript
// ✅ GOOD: Clear, readable code
async function getSwapQuote(params: SwapParams): Promise<SwapQuote> {
  // Input validation
  if (!params.amount || params.amount <= 0) {
    throw new Error("Invalid swap amount");
  }

  // Business logic
  const quote = await this.calculateQuote(params);

  // Return result
  return {
    amountIn: params.amount,
    amountOut: quote.amountOut,
    fee: quote.fee,
    priceImpact: quote.priceImpact
  };
}

// ❌ BAD: Unclear, hard to read
async function gsq(p){if(!p.a||p.a<=0)throw"E";const q=await this.cq(p);return{aI:p.a,aO:q.aO,f:q.f,pI:q.pI}}
```

### Error Handling
```typescript
// ✅ GOOD: Descriptive error handling
try {
  const result = await lbServices.swap(params);
  return result;
} catch (error) {
  // Log error with context
  logger.error("Swap failed", {
    userId: params.payer.toString(),
    amount: params.amount,
    error: error.message
  });

  // Throw user-friendly error
  throw new Error("Transaction failed. Please try again.");
}

// ❌ BAD: Generic error handling
try {
  return await lbServices.swap(params);
} catch (error) {
  throw error; // Loses context
}
```

### Documentation
```typescript
/**
 * Calculates the optimal swap amount for a given pair
 * @param params - Swap parameters
 * @param params.pair - The liquidity pool pair address
 * @param params.amount - Amount to swap (in smallest unit)
 * @param params.slippage - Maximum slippage tolerance (0-100)
 * @returns Promise resolving to swap quote with amounts and fees
 * @throws {Error} If parameters are invalid or pool doesn't exist
 * @example
 * ```typescript
 * const quote = await getSwapQuote({
 *   pair: new PublicKey("..."),
 *   amount: 1000000,
 *   slippage: 0.5
 * });
 * ```
 */
async function getSwapQuote(params: SwapParams): Promise<SwapQuote> {
  // Implementation
}
```

## 🧪 Testing

### Unit Tests
```typescript
// tests/unit/services/swap.test.ts
import { LiquidityBookServices } from "../../../src";
import { mockSwapParams } from "../../mocks";

describe("LiquidityBookServices - Swap", () => {
  let lbServices: LiquidityBookServices;

  beforeEach(() => {
    lbServices = new LiquidityBookServices({
      cluster: "devnet"
    });
  });

  describe("getSwapQuote", () => {
    it("should return valid quote for valid params", async () => {
      const params = mockSwapParams();
      const result = await lbServices.getSwapQuote(params);

      expect(result).toHaveProperty("amountIn");
      expect(result).toHaveProperty("amountOut");
      expect(result.amountOut).toBeGreaterThan(0);
    });

    it("should throw error for invalid amount", async () => {
      const params = { ...mockSwapParams(), amount: -1 };

      await expect(lbServices.getSwapQuote(params))
        .rejects.toThrow("Invalid swap amount");
    });

    it("should handle slippage correctly", async () => {
      const params = { ...mockSwapParams(), slippage: 0.1 };
      const result = await lbServices.getSwapQuote(params);

      expect(result.priceImpact).toBeLessThanOrEqual(0.1);
    });
  });
});
```

### Integration Tests
```typescript
// tests/integration/swap.integration.test.ts
describe("Swap Integration Tests", () => {
  let lbServices: LiquidityBookServices;
  let testWallet: Keypair;

  beforeAll(async () => {
    // Setup test environment
    lbServices = new LiquidityBookServices({
      cluster: "devnet",
      rpcUrl: "https://api.devnet.solana.com"
    });

    testWallet = Keypair.generate();
    // Fund test wallet
    await requestAirdrop(testWallet.publicKey, 1 * LAMPORTS_PER_SOL);
  });

  it("should execute complete swap flow", async () => {
    // 1. Get swap quote
    const quote = await lbServices.getSwapQuote({
      pair: testPoolAddress,
      amount: 1000000,
      slippage: 0.5
    });

    // 2. Execute swap
    const result = await lbServices.swap({
      ...quote,
      payer: testWallet.publicKey
    });

    // 3. Verify transaction
    const confirmation = await lbServices.connection.confirmTransaction(
      result.signature
    );

    expect(confirmation.value.err).toBeNull();

    // 4. Check balances changed
    const newBalance = await getTokenBalance(
      testTokenMint,
      testWallet.publicKey
    );
    expect(newBalance).not.toBe(initialBalance);
  });
});
```

### Test Coverage
```bash
# Run tests with coverage
pnpm test:coverage

# Generate coverage report
pnpm test:coverage -- --reporter=html

# Check coverage thresholds
pnpm test:coverage -- --check-coverage \
  --branches 80 \
  --functions 80 \
  --lines 80 \
  --statements 80
```

## 🔒 Security

### Security Checklist
- [ ] **Input Validation**: All user inputs validated
- [ ] **Access Control**: Proper authorization checks
- [ ] **Error Handling**: No sensitive data in errors
- [ ] **Dependencies**: No vulnerable dependencies
- [ ] **Audit**: Security review completed
- [ ] **Testing**: Comprehensive test coverage

### Reporting Security Issues
- **DO NOT** create public GitHub issues for security vulnerabilities
- **Email** security@saros.finance with details
- **Include** reproduction steps and potential impact
- **Allow** reasonable time for fix before disclosure

## 📚 Documentation

### Updating Documentation
```bash
# Generate API documentation
pnpm docs:generate

# Build documentation site
pnpm docs:build

# Serve documentation locally
pnpm docs:serve
```

### Documentation Standards
- Use clear, concise language
- Include code examples for all features
- Document parameters, return values, and errors
- Keep examples up-to-date with latest API
- Use consistent formatting and style

## 🚀 Release Process

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Security review completed
- [ ] Breaking changes documented
- [ ] Migration guide provided (if needed)

### Creating a Release
```bash
# Update version
pnpm version patch  # or minor, or major

# Update changelog
# Edit CHANGELOG.md with new version info

# Create release commit
git add .
git commit -m "chore: release v1.4.2"

# Create git tag
git tag v1.4.2

# Push to GitHub
git push origin main --tags

# GitHub Actions will handle the rest:
# - Run tests
# - Build packages
# - Publish to npm
# - Create GitHub release
```

## 🐛 Debugging

### Common Issues

#### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Clear TypeScript cache
rm -rf .tsbuildinfo

# Check Node.js version
node --version
```

#### Test Failures
```bash
# Run specific test
pnpm test -- --testNamePattern="should handle valid swap"

# Run tests in verbose mode
pnpm test -- --verbose

# Debug specific test
pnpm test -- --inspect-brk --testNamePattern="swap"
```

#### RPC Issues
```bash
# Check RPC connection
curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'

# Use different RPC endpoint
export RPC_URL=https://solana-api.projectserum.com
```

## 🤝 Code Review Process

### Review Checklist
- [ ] **Functionality**: Code works as expected
- [ ] **Tests**: Adequate test coverage
- [ ] **Style**: Follows coding standards
- [ ] **Documentation**: Code is well-documented
- [ ] **Security**: No security vulnerabilities
- [ ] **Performance**: No performance regressions

### Review Comments
```typescript
// ✅ GOOD: Specific, actionable feedback
"The calculateFee function should handle the case where binStep is 0
to prevent division by zero. Consider adding a check:
if (binStep === 0) throw new Error('Invalid bin step');"

// ❌ BAD: Vague feedback
"This function looks wrong. Fix it."
```

## 📊 Performance Guidelines

### Optimization Checklist
- [ ] **Bundle Size**: Minimize bundle size impact
- [ ] **Memory Usage**: Avoid memory leaks
- [ ] **CPU Usage**: Optimize computational complexity
- [ ] **Network Requests**: Minimize RPC calls
- [ ] **Caching**: Implement appropriate caching

### Performance Benchmarks
```typescript
// Benchmark swap performance
import { benchmark } from "utils/benchmark";

benchmark("Swap Performance", async () => {
  const result = await lbServices.swap(testParams);
  return result;
}, {
  iterations: 100,
  warmup: 10
});
```

## 🌍 Internationalization

### Text and Messages
- Use English for all user-facing text
- Provide descriptive error messages
- Avoid technical jargon in user messages
- Support internationalization hooks for UI libraries

## 🎯 Best Practices

### Git Best Practices
```bash
# Write clear commit messages
git commit -m "feat: add multi-bin position support

- Implement bin range validation
- Add position fee calculation
- Update TypeScript types
- Add comprehensive tests

Closes #123"

# Use conventional commits
# Types: feat, fix, docs, style, refactor, test, chore
```

### Code Review Best Practices
- Review your own code first
- Test changes locally
- Consider edge cases and error conditions
- Check for security implications
- Verify documentation is updated

### Communication
- Be respectful and constructive
- Use clear, specific language
- Provide context for changes
- Ask questions when unclear
- Celebrate good work

## 🏆 Recognition

### Contribution Recognition
- All contributors listed in CONTRIBUTORS.md
- Major contributors acknowledged in release notes
- Special recognition for security researchers
- Community recognition on social media

### Rewards Program
- **Bug Bounties**: Paid for valid bug reports
- **Feature Requests**: Recognition for implemented features
- **Documentation**: Rewards for comprehensive docs
- **Mentorship**: Recognition for helping new contributors

## 📞 Getting Help

### Resources
- **Documentation**: [docs.saros.finance](https://docs.saros.finance)
- **Discord**: [discord.gg/saros](https://discord.gg/saros)
- **GitHub Discussions**: For questions and ideas
- **Stack Overflow**: Tag with `saros-dlmm-sdk`

### Mentorship Program
- Pair programming sessions
- Code review guidance
- Architecture discussions
- Career development advice

---

## 🎉 Welcome to the Team!

We're thrilled to have you contribute to the Saros DLMM SDK! Your contributions help make DeFi more accessible and efficient for everyone.

**Remember**: Every expert was once a beginner. Don't be afraid to ask questions, and don't hesitate to contribute your ideas. Together, we're building something amazing! 🚀

---

*For questions about contributing, reach out to the maintainers on [Discord](https://discord.gg/saros) or create a [GitHub Discussion](https://github.com/saros-finance/dlmm-sdk/discussions).* 🤝</content>
<parameter name="filePath">h:\Rahul Prasad 01\earn\Saros\docs\CONTRIBUTING.md
