import { Connection, PublicKey, TransactionMessage } from '@solana/web3.js';
import LiquidityBookIDL from '../constants/idl/liquidity_book.json';
import { DLMMError } from '../error';
/**
 * Extracts the pair address from an initialize_pair transaction by parsing the instruction accounts
 */
export async function extractPairFromTx(connection: Connection, signature: string): Promise<PublicKey | null> {
  const parsedTransaction = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
  if (!parsedTransaction) throw new DLMMError('Transaction not found', 'TRANSACTION_NOT_FOUND');

  const compiledMessage = parsedTransaction.transaction.message;
  const message = TransactionMessage.decompile(compiledMessage);
  const instructions = message.instructions;
  const initializePairStruct = LiquidityBookIDL.instructions.find((item) => item.name === 'initialize_pair')!;

  const initializePairDescrimator = Buffer.from(initializePairStruct.discriminator);

  for (const instruction of instructions) {
    const descimatorInstruction = instruction.data.subarray(0, 8);
    if (!descimatorInstruction.equals(initializePairDescrimator)) continue;

    const accounts = initializePairStruct.accounts.map((item, index) => ({
      name: item.name,
      address: instruction.keys[index].pubkey,
    }));

    const pairAccount = accounts.find((item) => item.name === 'pair');
    return pairAccount ? pairAccount.address : null;
  }
  return null;
}
