"use client";

import { Connection, VersionedTransaction } from "@solana/web3.js";

type SolanaWalletProvider = {
  publicKey?: { toBase58?: () => string } | null;
  signTransaction?: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
};

type ExecutePreparedTransactionInput = {
  walletId?: string;
  expectedAddress: string;
  unsignedTxBase64: string;
  rpcUrl: string;
  recentBlockhash: string;
  lastValidBlockHeight: number;
};

function decodeBase64ToUint8Array(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function getGlobalProviderCandidates() {
  const value = window as typeof window & {
    phantom?: { solana?: SolanaWalletProvider };
    solana?: SolanaWalletProvider & {
      isPhantom?: boolean;
      isBackpack?: boolean;
      isJupiter?: boolean;
    };
    backpack?: SolanaWalletProvider;
    jupiter?: SolanaWalletProvider;
    jup?: SolanaWalletProvider;
  };

  return value;
}

export function getConnectedSolanaProvider(walletId?: string): SolanaWalletProvider | null {
  const globalValue = getGlobalProviderCandidates();

  if (walletId === "app.phantom") {
    return globalValue.phantom?.solana ?? (globalValue.solana?.isPhantom ? globalValue.solana : null);
  }

  if (walletId === "app.backpack") {
    return globalValue.backpack ?? (globalValue.solana?.isBackpack ? globalValue.solana : null);
  }

  if (walletId === "ag.jup") {
    return globalValue.jupiter ?? globalValue.jup ?? (globalValue.solana?.isJupiter ? globalValue.solana : null);
  }

  return (
    globalValue.phantom?.solana ??
    globalValue.backpack ??
    globalValue.jupiter ??
    globalValue.jup ??
    globalValue.solana ??
    null
  );
}

export async function executePreparedSolanaTransaction(
  input: ExecutePreparedTransactionInput,
) {
  const provider = getConnectedSolanaProvider(input.walletId);
  if (!provider?.signTransaction) {
    throw new Error("The connected Solana wallet cannot sign this transaction.");
  }

  const providerAddress = provider.publicKey?.toBase58?.();
  if (!providerAddress || providerAddress !== input.expectedAddress) {
    throw new Error("Connect the same Solana wallet that is saved on your seller profile before signing.");
  }

  const transaction = VersionedTransaction.deserialize(decodeBase64ToUint8Array(input.unsignedTxBase64));
  const signedTransaction = await provider.signTransaction(transaction);
  const connection = new Connection(input.rpcUrl, "confirmed");
  const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  const confirmation = await connection.confirmTransaction(
    {
      signature,
      blockhash: input.recentBlockhash,
      lastValidBlockHeight: input.lastValidBlockHeight,
    },
    "confirmed",
  );

  if (confirmation.value.err) {
    throw new Error("The Solana wallet submitted a transaction that failed on devnet.");
  }

  return { signature };
}
