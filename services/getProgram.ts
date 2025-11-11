import type { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export const getProgram = async (
  address: PublicKey,
  connection: Connection,
) => {
  const account = await connection.getParsedAccountInfo(address);

  const owner = account.value?.owner.toBase58();

  const program =
    owner === TOKEN_PROGRAM_ID.toBase58()
      ? TOKEN_PROGRAM_ID
      : TOKEN_2022_PROGRAM_ID;

  return program;
};
