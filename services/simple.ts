//   public async addLiquiditySimple(params: {
//     pair: PublicKey;
//     tokenX: { mintAddress: string; decimals: number };
//     tokenY: { mintAddress: string; decimals: number };
//     amountX: number;
//     amountY: number;
//     shape: LiquidityShape;
//     binRange: [number, number];
//     payer: PublicKey;
//   }): Promise<Transaction[]> {
//     const { pair, tokenX, tokenY, amountX, amountY, shape, binRange, payer } = params;

//     const pairInfo = await this.getPairAccount(pair);
//     const activeBin = pairInfo.activeId;

//     const connection = this.connection;
//     const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

//     let currentBlockhash = blockhash;
//     const maxPositionList = getMaxPosition([binRange[0], binRange[1]], activeBin);
//     const maxLiqDistribution = createUniformDistribution({ shape, binRange });
//     const binArrayList = getMaxBinArray(binRange, activeBin);

//     const allTxs: Transaction[] = [];
//     const initialTransaction = new Transaction();

//     // Initialize bin arrays and token accounts
//     await Promise.all(
//       binArrayList.map(async (item) => {
//         await this.getBinArray({
//           binArrayIndex: item.binArrayLowerIndex,
//           pair,
//           payer,
//           transaction: initialTransaction,
//         });
//         await this.getBinArray({
//           binArrayIndex: item.binArrayUpperIndex,
//           pair,
//           payer,
//           transaction: initialTransaction,
//         });
//       })
//     );

//     await Promise.all(
//       [tokenX, tokenY].map(async (token) => {
//         await this.getPairVaultInfo({
//           payer,
//           transaction: initialTransaction,
//           tokenAddress: new PublicKey(token.mintAddress),
//           pair,
//         });
//         await this.getUserVaultInfo({
//           payer,
//           tokenAddress: new PublicKey(token.mintAddress),
//           transaction: initialTransaction,
//         });
//       })
//     );

//     if (initialTransaction.instructions.length > 0) {
//       initialTransaction.recentBlockhash = currentBlockhash;
//       initialTransaction.feePayer = payer;
//       allTxs.push(initialTransaction);
//     }

//     const positions = await this.getUserPositions({ payer, pair });

//     const maxLiquidityDistributions = await Promise.all(
//       maxPositionList.map(async (item) => {
//         const { range: relativeBinRange, binLower, binUpper } = getBinRange(item, activeBin);
//         const currentPosition = positions.find(findPosition(item, activeBin));

//         const findStartIndex = maxLiqDistribution.findIndex(
//           (item) => item.relativeBinId === relativeBinRange[0]
//         );
//         const startIndex = findStartIndex === -1 ? 0 : findStartIndex;

//         const findEndIndex = maxLiqDistribution.findIndex(
//           (item) => item.relativeBinId === relativeBinRange[1]
//         );
//         const endIndex = findEndIndex === -1 ? maxLiqDistribution.length : findEndIndex + 1;

//         const liquidityDistribution = maxLiqDistribution.slice(startIndex, endIndex);

//         const binArray = binArrayList.find(
//           (item) =>
//             item.binArrayLowerIndex * 256 <= binLower &&
//             (item.binArrayUpperIndex + 1) * 256 > binUpper
//         )!;

//         const binArrayLower = await this.getBinArray({
//           binArrayIndex: binArray.binArrayLowerIndex,
//           pair,
//           payer,
//         });
//         const binArrayUpper = await this.getBinArray({
//           binArrayIndex: binArray.binArrayUpperIndex,
//           pair,
//           payer,
//         });

//         if (!currentPosition) {
//           const transaction = new Transaction();
//           const positionMintKeypair = Keypair.generate();

//           const { position } = await this.createPosition({
//             pair,
//             payer,
//             relativeBinIdLeft: relativeBinRange[0],
//             relativeBinIdRight: relativeBinRange[1],
//             binArrayIndex: binArray.binArrayLowerIndex,
//             positionMint: positionMintKeypair.publicKey,
//             transaction,
//           });

//           transaction.feePayer = payer;
//           transaction.recentBlockhash = currentBlockhash;
//           transaction.sign(positionMintKeypair);

//           allTxs.push(transaction);

//           return {
//             positionMint: positionMintKeypair.publicKey.toString(),
//             position,
//             liquidityDistribution,
//             binArrayLower: binArrayLower.toString(),
//             binArrayUpper: binArrayUpper.toString(),
//           };
//         }

//         return {
//           positionMint: currentPosition.positionMint,
//           liquidityDistribution,
//           binArrayLower: binArrayLower.toString(),
//           binArrayUpper: binArrayUpper.toString(),
//         };
//       })
//     );

//     // Add liquidity transactions
//     await Promise.all(
//       maxLiquidityDistributions.map(async (item) => {
//         const { binArrayLower, binArrayUpper, liquidityDistribution, positionMint } = item;
//         const transaction = new Transaction();

//         const scaleAmount = (value: number, decimals: number) =>
//           Math.floor(value * Math.pow(10, decimals));

//         await this.addLiquidityIntoPosition({
//           amountX: BigInt(scaleAmount(amountX, tokenX.decimals)),
//           amountY: BigInt(scaleAmount(amountY, tokenY.decimals)),
//           binArrayLower: new PublicKey(binArrayLower),
//           binArrayUpper: new PublicKey(binArrayUpper),
//           liquidityDistribution,
//           pair,
//           positionMint: new PublicKey(positionMint),
//           payer,
//           transaction,
//         });

//         transaction.recentBlockhash = currentBlockhash;
//         transaction.feePayer = payer;
//         allTxs.push(transaction);
//       })
//     );

//     return allTxs;
//   }