import { Connection, PublicKey } from "@solana/web3.js";
export declare const getProgram: (address: PublicKey, connection: Connection) => Promise<PublicKey>;
