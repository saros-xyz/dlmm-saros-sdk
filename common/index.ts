import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { get } from "lodash";

const txsFail = "txsFail";

export async function awaitTransactionSignatureConfirmation(
  connection: Connection,
  txid: string,
  timeout = 20000
) {
  let done = false;
  const connectionOrca = connection;
  const result = await new Promise((resolve, reject) => {
    (async () => {
      setTimeout(() => {
        if (done) {
          return;
        }
        done = true;
        console.log("Timed out for txid", txid);
        const timeout = { timeout: true };
        reject(timeout);
      }, timeout);
      try {
        connectionOrca.onSignature(
          txid,
          (result) => {
            done = true;

            if (result.err) {
              const isExceedsLimit =
                get(result.err, "InstructionError[1].Custom") === 30 ||
                get(result.err, "InstructionError[1].Custom") === 16;
              const isNotEnoughSol =
                get(result.err, "InstructionError[1].Custom") === 1;
              done = true;
              if (isNotEnoughSol) {
                reject({
                  isError: true,
                  mess: isNotEnoughSol ? "Error gasSolNotEnough" : txsFail,
                });
              }
              reject({
                isError: true,
                mess: isExceedsLimit ? "Error exceedsLimit" : txsFail,
              });
            } else {
              resolve(result);
            }
          },
          "recent"
        );
      } catch (e) {
        done = true;
        console.log("WS error in setup", txid, e);
      }
      while (!done) {
        (async () => {
          try {
            const signatureStatuses = await connectionOrca.getSignatureStatuses(
              [txid]
            );
            const result = signatureStatuses && signatureStatuses.value[0];
            if (!done) {
              if (!result) {
                console.log("REST null result for", txid, result);
              } else if (result.err) {
                const isExceedsLimit =
                  get(result.err, "InstructionError[1].Custom") === 30 ||
                  get(result.err, "InstructionError[1].Custom") === 16;
                const isNotEnoughSol =
                  get(result.err, "InstructionError[1].Custom") === 1;
                done = true;
                if (isNotEnoughSol) {
                  reject({
                    isError: true,
                    mess: isNotEnoughSol ? "Error gasSolNotEnough" : txsFail,
                  });
                }
                reject({
                  isError: true,
                  mess: isExceedsLimit ? "Error exceedsLimit" : txsFail,
                });
              } else if (!result.confirmations) {
                done = true;
                resolve(result);
              } else {
                done = true;
                resolve(result);
              }
            }
          } catch (e) {
            if (!done) {
              console.log("REST connection error: txid", txid, e);
            }
          }
        })();
      }
    })();
  });
  done = true;
  return result;
}

export async function signTransaction(transaction: Transaction) {
  // @ts-expect-error
  return window.coin98.sol
    .request({ method: "sol_sign", params: [transaction] })
    .then((res) => {
      const sig = bs58.decode(res.signature);
      const publicKey = new PublicKey(res.publicKey);
      transaction.addSignature(publicKey, sig);
      return transaction;
    })
    .catch((err) => {
      throw err;
    });
}

export async function sendTransaction(
  connection: Connection,
  transaction: Transaction,
  signers = []
) {
  try {
    console.log({ transaction, signers });
    transaction = await signTransaction(transaction);
    if (signers.length > 1) {
      const getSignerValid = signers.slice().filter((it) => it.secretKey);
      transaction.partialSign(...getSignerValid);
    }
    const rawTransaction = transaction.serialize();
    const hash = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
    });
    console.log({ hash });

    await awaitTransactionSignatureConfirmation(connection, hash);
    return hash;
  } catch (mess) {
    console.log({ mess });
    return { isError: true, mess: encodeMessErr(mess.mess) };
  }
}
