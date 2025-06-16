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

```
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";
import { PublicKey } from "@solana/web3.js";

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
		payer: new PublicKey(address!) // Replace with your wallet public key
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
```
