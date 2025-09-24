/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from 'fs';
import * as path from 'path';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

export interface TestWalletConfig {
  walletFile: string;
  tokenConfigFile: string;
  minBalanceSol: number;
  devnetRpcUrl: string;
}

export interface TestTokenInfo {
  name: string;
  symbol: string;
  mintAddress: string;
  decimals: number;
  supply: number;
  associatedTokenAccount?: string;
}

export interface TestPoolInfo {
  pair: string;
  baseToken: string;
  quoteToken: string;
  binStep: number;
  ratePrice: number;
  activeBin: number;
  binArrayLower: string;
  binArrayUpper: string;
  signature: string;
}

export interface TestWalletInfo {
  address: string;
  keypair: Keypair;
  balance: number;
  tokens: TestTokenInfo[];
  pools?: TestPoolInfo[];
}

const DEFAULT_CONFIG: TestWalletConfig = {
  walletFile: 'test-wallet.json',
  tokenConfigFile: 'test-tokens.json',
  minBalanceSol: 0.1,
  devnetRpcUrl: process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com',
};

export class TestWalletSetup {
  private config: TestWalletConfig;
  private testDir: string;
  private connection: Connection;

  constructor(config: Partial<TestWalletConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.testDir = path.join(process.cwd(), 'test-data');

    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
    this.connection = new Connection(this.config.devnetRpcUrl, 'confirmed');
  }

  private getWalletPath(): string {
    return path.join(this.testDir, this.config.walletFile);
  }

  private getTokenConfigPath(): string {
    return path.join(this.testDir, this.config.tokenConfigFile);
  }

  private saveKeypair(keypair: Keypair, filePath: string): void {
    const secretKey = Array.from(keypair.secretKey);
    fs.writeFileSync(filePath, JSON.stringify(secretKey));
  }

  private loadKeypair(filePath: string): Keypair {
    const secretKey = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(secretKey));
  }

  private async loadOrCreateWallet(): Promise<Keypair> {
    const walletPath = this.getWalletPath();

    if (fs.existsSync(walletPath)) {
      try {
        const keypair = this.loadKeypair(walletPath);
        return keypair;
      } catch (error) {
        console.warn('Failed to load existing wallet, creating new one...');
      }
    }

    const keypair = Keypair.generate();
    this.saveKeypair(keypair, walletPath);
    console.log(`Created test wallet: ${keypair.publicKey.toBase58()}`);
    return keypair;
  }

  private async requestAirdrop(publicKey: PublicKey, amount: number): Promise<void> {
    try {
      const signature = await this.connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);

      await this.connection.confirmTransaction(signature, 'confirmed');
    } catch (error) {
      console.error('Airdrop failed:', error);
      throw new Error('Failed to get SOL from faucet. Try again later or use a different RPC.');
    }
  }

  private async ensureWalletFunded(wallet: Keypair): Promise<void> {
    const balance = await this.connection.getBalance(wallet.publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    if (solBalance >= this.config.minBalanceSol) {
      return;
    }

    const amountToRequest = Math.max(2.0, this.config.minBalanceSol + 0.5);
    await this.requestAirdrop(wallet.publicKey, amountToRequest);
  }

  private loadTestData(): { tokens: TestTokenInfo[]; pools: TestPoolInfo[] } {
    const tokenConfigPath = this.getTokenConfigPath();

    if (!fs.existsSync(tokenConfigPath)) {
      return { tokens: [], pools: [] };
    }

    try {
      const data = JSON.parse(fs.readFileSync(tokenConfigPath, 'utf-8'));

      if (Array.isArray(data)) {
        return { tokens: data, pools: [] };
      }

      return {
        tokens: data.tokens || [],
        pools: data.pools || [],
      };
    } catch (error) {
      console.warn('Failed to load test data:', error);
      return { tokens: [], pools: [] };
    }
  }

  private async setupTokenAccounts(
    wallet: Keypair,
    tokenConfigs: TestTokenInfo[]
  ): Promise<TestTokenInfo[]> {
    const tokensWithAccounts: TestTokenInfo[] = [];

    for (const tokenConfig of tokenConfigs) {
      try {
        const mintInfo = await this.connection.getAccountInfo(
          new PublicKey(tokenConfig.mintAddress)
        );
        if (!mintInfo) {
          console.warn(`Token mint ${tokenConfig.mintAddress} not found on devnet`);
          continue;
        }

        const tokenAccount = await getOrCreateAssociatedTokenAccount(
          this.connection,
          wallet,
          new PublicKey(tokenConfig.mintAddress),
          wallet.publicKey
        );

        const tokenWithAccount: TestTokenInfo = {
          ...tokenConfig,
          associatedTokenAccount: tokenAccount.address.toBase58(),
        };

        tokensWithAccounts.push(tokenWithAccount);
      } catch (error) {
        console.error(`Failed to setup token account for ${tokenConfig.symbol}:`, error);
      }
    }

    return tokensWithAccounts;
  }

  public async setup(): Promise<TestWalletInfo> {
    try {
      const wallet = await this.loadOrCreateWallet();
      await this.ensureWalletFunded(wallet);

      const balance = await this.connection.getBalance(wallet.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      const testData = this.loadTestData();
      const tokens = await this.setupTokenAccounts(wallet, testData.tokens);

      const walletInfo: TestWalletInfo = {
        address: wallet.publicKey.toBase58(),
        keypair: wallet,
        balance: solBalance,
        tokens,
        pools: testData.pools,
      };

      return walletInfo;
    } catch (error) {
      console.error('Test setup failed:', error);
      throw error;
    }
  }

  public getConnection(): Connection {
    return this.connection;
  }

  public static generateTestKeypair(): Keypair {
    return Keypair.generate();
  }

  public saveTestData(walletInfo: TestWalletInfo): void {
    const tokenConfigPath = this.getTokenConfigPath();

    const testData = {
      tokens: walletInfo.tokens,
      pools: walletInfo.pools || [],
    };

    fs.writeFileSync(tokenConfigPath, JSON.stringify(testData, null, 2));
  }
}
