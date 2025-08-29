# Saros DLMM

The engine that powers the Internet Capital Market on Solana.

# Installation

Use your environment's package manager to install @saros-finance/dlmm-sdk into your project.

```
yarn add @saros-finance/dlmm-sdk
```

```
npm install @saros-finance/dlmm-sdk
```

# Usage

```javascript
import {
  BIN_STEP_CONFIGS,
  LiquidityBookServices,
  MODE,
} from "@saros-finance/dlmm-sdk";
import { PublicKey, Transaction, Keypair } from "@solana/web3.js";
import {
  LiquidityShape,
  PositionInfo,
  RemoveLiquidityType,
} from "@saros-finance/dlmm-sdk/types/services";
import {
  createUniformDistribution,
  findPosition,
  getBinRange,
  getMaxBinArray,
  getMaxPosition,
} from "@saros-finance/dlmm-sdk/utils";
import bigDecimal from "js-big-decimal";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

const liquidityBookServices = new LiquidityBookServices({
	mode: MODE.MAINNET,
});

const YOUR_WALLET = "";

// Pool example on saros C98 to USDC
const USDC_TOKEN = {
	id: "usd-coin",
	mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
	symbol: "usdc",
	name: "USD Coin",
	decimals: 6,
	addressSPL: "FXRiEosEvHnpc3XZY1NS7an2PB1SunnYW1f5zppYhXb3",
};

const C98_TOKEN = {
	id: "coin98",
	mintAddress: "C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9",
	symbol: "C98",
	name: "Coin98",
	decimals: 6,
	addressSPL: "EKCdCBjfQ6t5FBfDC2zvmr27PgfVVZU37C8LUE4UenKb",
};

const POOL_PARAMS = {
	address: "EwsqJeioGAXE5EdZHj1QvcuvqgVhJDp9729H5wjh28DD",
	baseToken: C98_TOKEN,
	quoteToken: USDC_TOKEN,
	slippage: 0.5,
	hook: "", // config for reward, adding later
};

const WSOL_TOKEN_DEVNET = {
  id: "wsol",
	mintAddress: "So11111111111111111111111111111111111111112",
	symbol: "WSOL",
	name: "WSOL",
	decimals: 9,
}

const SAROS_TOKEN_DEVNET = {
  id: "saros",
	mintAddress: "mntCAkd76nKSVTYxwu8qwQnhPcEE9JyEbgW6eEpwr1N",
	symbol: "DEXV3-SAROS",
	name: "Dex V3 Saros",
	decimals: 6,
}

const POOL_PARAMS_DEVNET = {
  address: "C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB",
  baseToken: SAROS_TOKEN_DEVNET,
  quoteToken: SOL_TOKEN_DEVNET,
  slippage: 0.5,
  hook: "", // config for reward, adding later
};

const onSwap = async () => {
	const amountFrom = 1e6 // Token C98
	const quoteData = await liquidityBookServices.getQuote({
		amount: BigInt(amountFrom),
		isExactInput: true, // input amount in
		swapForY: true, // swap from C98 to USDC
		pair: new PublicKey(POOL_PARAMS.address),
		tokenBase: new PublicKey(POOL_PARAMS.baseToken.mintAddress),
		tokenQuote: new PublicKey(POOL_PARAMS.quoteToken.mintAddress),
		tokenBaseDecimal: POOL_PARAMS.baseToken.decimals,
		tokenQuoteDecimal: POOL_PARAMS.quoteToken.decimals,
		slippage: POOL_PARAMS.slippage
	})

	const { amountIn, amountOut, priceImpact, amount, otherAmountOffset } =
		quoteData // slippage included

	const transaction = await liquidityBookServices.swap({
		amount,
		tokenMintX: new PublicKey(POOL_PARAMS.baseToken.mintAddress),
		tokenMintY: new PublicKey(POOL_PARAMS.quoteToken.mintAddress),
		otherAmountOffset,
		hook: new PublicKey(liquidityBookServices.hooksConfig), // Optional, if you have a hook for reward
		isExactInput: true, // input amount in
		swapForY: true, // swap from C98 to USDC
		pair: new PublicKey(POOL_PARAMS.address),
		payer: new PublicKey(YOUR_WALLET) // Replace with your wallet public key
	})

	const signedTransaction = signTransaction(transaction);

	const signature = await liquidityBookServices.connection.sendRawTransaction(
	signedTransaction.serialize(),
		{
			skipPreflight: true,
			preflightCommitment: "confirmed",
		}
	);

	const { blockhash, lastValidBlockHeight } = await liquidityBookServices.connection.getLatestBlockhash();

	await liquidityBookServices.connection.confirmTransaction({
		signature,
		blockhash,
		lastValidBlockHeight,
	});
};

// Get Dex Name
const getDexName = () => {
    try {
      const response = liquidityBookServices.getDexName();
      return response;
    } catch (error) {
      return "";
    }
};

// Get Dex Program ID
const getDexProgramId = () => {
    try {
      const response = liquidityBookServices.getDexProgramId();
      return response;
    } catch (error) {
      return "";
    }
};

// Query all pools on Saros DLMM
const getPoolAddresses = async () => {
    try {
      const response = await liquidityBookServices.fetchPoolAddresses();
      return response;
    } catch (error) {
      return [];
    }
};

// Fetch Pool Metatdata
const fetchPoolMetadata = async () => {
    try {
      const response = await liquidityBookServices.fetchPoolMetadata(
        POOL_PARAMS.address
      );
      return response;
    } catch (error) {
      return {};
    }
};

// Listen new pool address
const onListenNewPoolAddress = async () => {
    const postTx = async (poolAddres: string) => {
      console.log("🚀 ~ onListenNewPoolAddress ~ poolAddres:", poolAddres);
    };
    await liquidityBookServices.listenNewPoolAddress(postTx);
};

const convertBalanceToWei = (strValue: number, iDecimal: number = 9) => {
  	if (strValue === 0) return 0;

  	try {
    	const multiplyNum = new bigDecimal(Math.pow(10, iDecimal));
    	const convertValue = new bigDecimal(Number(strValue));
    	const result = multiplyNum.multiply(convertValue);
    	return result.getValue();
  	} catch {
    	return 0;
  	}
};

// Create Pool
const onCreatePool = async () => {
    const connection = liquidityBookServices.connection;
    const tokenX = C98_TOKEN;
    const tokenY = USDC_TOKEN;
    const binStep = BIN_STEP_CONFIGS[3].binStep; // Example bin step, you can choose from BIN_STEP_CONFIGS
    const ratePrice = 1; // Example rate price, you can set it based on your requirements
    const payer = new PublicKey(YOUR_WALLET);

    const { blockhash, lastValidBlockHeight } =
      await connection!.getLatestBlockhash({
        commitment: "confirmed",
      });

    const { tx } = await liquidityBookServices.createPairWithConfig({
      tokenBase: {
        mintAddress: tokenX.mintAddress,
        decimal: tokenX.decimals,
      },
      tokenQuote: {
        mintAddress: tokenY.mintAddress,
        decimal: tokenY.decimals,
      },
      ratePrice,
      binStep,
      payer,
    });
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer;

    const response = await window.coin98?.sol.signTransaction(tx);
    if (response) {
      const publicKey = new PublicKey(response.publicKey);

      tx.addSignature(publicKey, bs58.decode(response.signature) as Buffer);

      const txSerialize = tx.serialize();

      const transactionHash = await connection?.sendRawTransaction(
        txSerialize,
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
        }
      );

      await connection!.confirmTransaction(
        { signature: transactionHash!, blockhash, lastValidBlockHeight },
        "finalized"
      );
    }
};

// Add liquidity
const onAddliquidity = async () => {
    const tokenX = C98_TOKEN;
    const tokenY = USDC_TOKEN;

    const payer = new PublicKey(YOUR_WALLET);
    const pair = new PublicKey(POOL_PARAMS.address);
    const shape = LiquidityShape.Spot;
    const binRange = [-10, 10] as [number, number]; // Example bin range
    const positions = await liquidityBookServices.getUserPositions({
      payer,
      pair,
    });
    const pairInfo = await liquidityBookServices.getPairAccount(pair);
    const activeBin = pairInfo.activeId;

    const connection = liquidityBookServices.connection;

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    let currentBlockhash = blockhash;
    let currentLastValidBlockHeight = lastValidBlockHeight;

    const maxPositionList = getMaxPosition(
      [binRange[0], binRange[1]],
      activeBin
    );

    const maxLiqDistribution = createUniformDistribution({
      shape,
      binRange,
    });

    const binArrayList = getMaxBinArray(binRange, activeBin);

    const allTxs: Transaction[] = [];
    const txsCreatePosition: Transaction[] = [];

    const initialTransaction = new Transaction();

    await Promise.all(
      binArrayList.map(async (item) => {
        await liquidityBookServices.getBinArray({
          binArrayIndex: item.binArrayLowerIndex,
          pair: new PublicKey(pair),
          payer,
          transaction: initialTransaction,
        });

        await liquidityBookServices.getBinArray({
          binArrayIndex: item.binArrayUpperIndex,
          pair: new PublicKey(pair),
          payer,
          transaction: initialTransaction,
        });
      })
    );

    await Promise.all(
      [tokenX, tokenY].map(async (token) => {
        await liquidityBookServices.getPairVaultInfo({
          payer,
          transaction: initialTransaction,
          tokenAddress: new PublicKey(token.mintAddress),
          pair: new PublicKey(pair),
        });
        await liquidityBookServices.getUserVaultInfo({
          payer,
          tokenAddress: new PublicKey(token.mintAddress),
          transaction: initialTransaction,
        });
      })
    );

    if (initialTransaction.instructions.length > 0) {
      initialTransaction.recentBlockhash = currentBlockhash;
      initialTransaction.feePayer = payer;
      allTxs.push(initialTransaction);
    }

    const maxLiquidityDistributions = await Promise.all(
      maxPositionList.map(async (item) => {
        const {
          range: relativeBinRange,
          binLower,
          binUpper,
        } = getBinRange(item, activeBin);
        const currentPosition = positions.find(findPosition(item, activeBin));

        const findStartIndex = maxLiqDistribution.findIndex(
          (item) => item.relativeBinId === relativeBinRange[0]
        );
        const startIndex = findStartIndex === -1 ? 0 : findStartIndex;

        const findEndIndex = maxLiqDistribution.findIndex(
          (item) => item.relativeBinId === relativeBinRange[1]
        );
        const endIndex =
          findEndIndex === -1 ? maxLiqDistribution.length : findEndIndex + 1;

        const liquidityDistribution = maxLiqDistribution.slice(
          startIndex,
          endIndex
        );

        const binArray = binArrayList.find(
          (item) =>
            item.binArrayLowerIndex * 256 <= binLower &&
            (item.binArrayUpperIndex + 1) * 256 > binUpper
        )!;

        const binArrayLower = await liquidityBookServices.getBinArray({
          binArrayIndex: binArray.binArrayLowerIndex,
          pair: new PublicKey(pair),
          payer,
        });
        const binArrayUpper = await liquidityBookServices.getBinArray({
          binArrayIndex: binArray.binArrayUpperIndex,
          pair: new PublicKey(pair),
          payer,
        });

        if (!currentPosition) {
          const transaction = new Transaction();

          const positionMint = Keypair.generate();

          const { position } = await liquidityBookServices.createPosition({
            pair: new PublicKey(pair),
            payer,
            relativeBinIdLeft: relativeBinRange[0],
            relativeBinIdRight: relativeBinRange[1],
            binArrayIndex: binArray.binArrayLowerIndex,
            positionMint: positionMint.publicKey,
            transaction,
          });
          transaction.feePayer = payer;
          transaction.recentBlockhash = currentBlockhash;

          transaction.sign(positionMint);

          txsCreatePosition.push(transaction);
          allTxs.push(transaction);

          return {
            positionMint: positionMint.publicKey.toString(),
            position,
            liquidityDistribution,
            binArrayLower: binArrayLower.toString(),
            binArrayUpper: binArrayUpper.toString(),
          };
        }

        return {
          positionMint: currentPosition.positionMint,
          liquidityDistribution,
          binArrayLower: binArrayLower.toString(),
          binArrayUpper: binArrayUpper.toString(),
        };
      })
    );

    const txsAddLiquidity = await Promise.all(
      maxLiquidityDistributions.map(async (item) => {
        const {
          binArrayLower,
          binArrayUpper,
          liquidityDistribution,
          positionMint,
        } = item;
        const transaction = new Transaction();
        await liquidityBookServices.addLiquidityIntoPosition({
          amountX: Number(convertBalanceToWei(10, tokenX.decimals)),
          amountY: Number(convertBalanceToWei(10, tokenY.decimals)),
          binArrayLower: new PublicKey(binArrayLower),
          binArrayUpper: new PublicKey(binArrayUpper),
          liquidityDistribution,
          pair: new PublicKey(pair),
          positionMint: new PublicKey(positionMint),
          payer,
          transaction,
        });

        transaction.recentBlockhash = currentBlockhash;
        transaction.feePayer = payer;

        allTxs.push(transaction);
        return transaction;
      })
    );
    const response = await window.coin98.sol.signAllTransactions(allTxs);
    const publicKey = new PublicKey(response.publicKey);
    const signatures = response.signatures;

    const signedTxs = allTxs.map((transaction, index) => {
      const signature = bs58.decode(signatures[index]!);
      transaction.addSignature(publicKey, signature);
      return transaction;
    });

    const hash: string[] = [];

    if (initialTransaction.instructions.length) {
      const tx = signedTxs.shift() || initialTransaction;
      const txHash = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      hash.push(txHash);

      await connection.confirmTransaction(
        {
          signature: txHash,
          blockhash: currentBlockhash,
          lastValidBlockHeight: currentLastValidBlockHeight,
        },
        "finalized"
      );

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      currentBlockhash = blockhash;
      currentLastValidBlockHeight = lastValidBlockHeight;
    }
    if (txsCreatePosition.length) {
      await Promise.all(
        txsCreatePosition.map(async (tx) => {
          const serializeTx = (signedTxs.shift() || tx).serialize();

          const txHash = await connection.sendRawTransaction(serializeTx, {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          });

          hash.push(txHash);

          await connection.confirmTransaction(
            {
              signature: txHash,
              blockhash: currentBlockhash,
              lastValidBlockHeight: currentLastValidBlockHeight,
            },
            "finalized"
          );
          hash.push(txHash);
        })
      );

      const { blockhash, lastValidBlockHeight } =
        await connection!.getLatestBlockhash();

      currentBlockhash = blockhash;
      currentLastValidBlockHeight = lastValidBlockHeight;
    }

    // Transaction for adding liquidity
    await Promise.all(
      txsAddLiquidity.map(async (tx) => {
        const serializeTx = (signedTxs.shift() || tx).serialize();

        const txHash = await connection.sendRawTransaction(serializeTx, {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });
        if (!txHash) return;

        hash.push(txHash);

        await connection!.confirmTransaction(
          {
            signature: txHash,
            blockhash: currentBlockhash,
            lastValidBlockHeight: currentLastValidBlockHeight,
          },
          "finalized"
        );
      })
    );

    console.log("Transaction hashes:", hash);
};

// Remove liquidity
const onRemoveLiquidity = async () => {
    const tokenX = C98_TOKEN;
    const tokenY = USDC_TOKEN;
    const connection = liquidityBookServices.connection;
    const type = RemoveLiquidityType.Both;
    const pair = new PublicKey(POOL_PARAMS.address);
    const payer = new PublicKey(YOUR_WALLET);

    if (!type) {
      throw new Error("Invalid parameters");
    }

    const pairInfo = await liquidityBookServices.getPairAccount(pair);

    const activeId = pairInfo.activeId;

    const range = [activeId - 3, activeId + 3] as [number, number]; // Example range

    const positions = await liquidityBookServices.getUserPositions({
      payer,
      pair,
    });

    const positionList = positions.filter((item: PositionInfo) => {
      return !(item.upperBinId < range[0] || item.lowerBinId > range[1]);
    });

    if (!positionList.length) throw Error("No position found in this range");

    const maxPositionList = positionList.map((item: PositionInfo) => {
      const start = range[0] > item.lowerBinId ? range[0] : item.lowerBinId;
      const end = range[1] < item.upperBinId ? range[1] : item.upperBinId;

      return {
        position: item.position,
        start,
        end,
        positionMint: item.positionMint,
      };
    });

    const { blockhash, lastValidBlockHeight } =
      await connection!.getLatestBlockhash({
        commitment: "confirmed",
      });

    const { txs, txCreateAccount, txCloseAccount } =
      await liquidityBookServices.removeMultipleLiquidity({
        maxPositionList: maxPositionList,
        payer,
        type,
        pair: new PublicKey(pair),
        tokenMintX: new PublicKey(tokenX.mintAddress),
        tokenMintY: new PublicKey(tokenY.mintAddress),
        activeId,
      });

    const allTxs = [...txs];

    if (txCreateAccount) {
      allTxs.unshift(txCreateAccount);
    }
    if (txCloseAccount) {
      allTxs.push(txCloseAccount);
    }

    allTxs.forEach((tx) => {
      tx.feePayer = payer;
      tx.recentBlockhash = blockhash;
    });

    const response = await window.coin98.sol.signAllTransactions(allTxs);
    const publicKey = new PublicKey(response.publicKey);
    const signatures = response.signatures;

    const signedTxs = allTxs.map((transaction, index) => {
      const signature = bs58.decode(signatures[index]!);
      transaction.addSignature(publicKey, signature);
      return transaction;
    });

    if (txCreateAccount) {
      const tx = signedTxs.shift() || txCreateAccount;
      const hash = await connection!.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
        preflightCommitment: "finalized",
      });

      await connection!.confirmTransaction({
        signature: hash,
        blockhash,
        lastValidBlockHeight,
      });
    }

    const {
      blockhash: newBlockhash,
      lastValidBlockHeight: newLastValidBlockHeight,
    } = await connection!.getLatestBlockhash({
      commitment: "confirmed",
    });

    const hash: string[] = [];
    await Promise.all(
      txs.map(async (_tx) => {
        const tx = signedTxs.shift() || _tx;
        const txHash = await connection!.sendRawTransaction(tx.serialize(), {
          skipPreflight: true,
          preflightCommitment: "confirmed",
        });

        hash.push(txHash);
        await connection!.confirmTransaction(
          {
            signature: txHash,
            blockhash: newBlockhash,
            lastValidBlockHeight: newLastValidBlockHeight,
          },
          "finalized"
        );
      })
    );

    if (txCloseAccount) {
      const tx = signedTxs.shift() || txCloseAccount;
      const txHash = await connection!.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
        preflightCommitment: "finalized",
      });

      hash.push(txHash);
    }
    console.log("🚀 ~ onRemoveLiquidity ~ hash:", hash);
};

```
