import { randomUUID } from "node:crypto";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createV1, mplCore } from "@metaplex-foundation/mpl-core";
import { createNoopSigner, generateSigner, publicKey, signerIdentity } from "@metaplex-foundation/umi";
import { toWeb3JsInstruction, toWeb3JsKeypair, toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import { PublicKey, Transaction } from "@solana/web3.js";
import type { MintRequest } from "../types/art";
import type { BlockingIssue } from "./devnetErrors";
import { issuesToMessages, missingEnvIssue, rpcIssue } from "./devnetErrors";
import { getRpcUrl, getSolanaConnection } from "./solana";

export interface StorageAdapterResult {
  uri: string;
  provider: string;
  warning?: string;
}

export interface StorageAdapter {
  uploadMetadataJson(input: {
    objectKey: string;
    metadata: Record<string, unknown>;
  }): Promise<StorageAdapterResult>;
}

class DevStorageAdapter implements StorageAdapter {
  async uploadMetadataJson(input: {
    objectKey: string;
    metadata: Record<string, unknown>;
  }): Promise<StorageAdapterResult> {
    void input.metadata;
    return {
      uri: `ar://dev-placeholder/${input.objectKey}`,
      provider: "dev_stub",
      warning:
        "Storage adapter running in dev-stub mode. Set STORAGE_WRITE_ENDPOINT and STORAGE_BEARER_TOKEN for real uploads.",
    };
  }
}

class HttpStorageAdapter implements StorageAdapter {
  constructor(private readonly endpoint: string, private readonly bearerToken: string) {}

  async uploadMetadataJson(input: {
    objectKey: string;
    metadata: Record<string, unknown>;
  }): Promise<StorageAdapterResult> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.bearerToken}`,
      },
      body: JSON.stringify({
        objectKey: input.objectKey,
        payload: input.metadata,
        contentType: "application/json",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Storage upload failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as { uri?: string; provider?: string };
    if (!payload.uri) {
      throw new Error("Storage upload response missing uri");
    }

    return {
      uri: payload.uri,
      provider: payload.provider ?? "http_storage",
    };
  }
}

export interface MintPreparationResult {
  mintIntentId: string;
  draftAssetId: string;
  metadataUri: string;
  mediaUri: string;
  metadataJson: Record<string, unknown>;
  visibility: "PRIVATE_REVIEW_ONLY";
  listable: false;
  provenanceSummary: {
    category: string;
    medium: string;
    verificationStatus: string;
  };
  warnings: string[];
  blockingErrors: string[];
  blockingIssueDetails: BlockingIssue[];
  unsignedTxBase64?: string;
  txInspection: {
    network: string;
    payer: string;
    programIds: string[];
    accounts: Record<string, string>;
    notes: string[];
  };
  nextActions: string[];
}

function getStorageAdapter(): StorageAdapter {
  const endpoint = process.env.STORAGE_WRITE_ENDPOINT;
  const bearerToken = process.env.STORAGE_BEARER_TOKEN;

  if (endpoint && bearerToken) {
    return new HttpStorageAdapter(endpoint, bearerToken);
  }

  return new DevStorageAdapter();
}

export async function prepareMintIntent(input: MintRequest): Promise<MintPreparationResult> {
  const mintIntentId = `mint-intent-${randomUUID()}`;
  const draftAssetId = `draft-asset-${randomUUID()}`;

  const metadataJson = {
    name: input.title,
    description: input.description,
    image: input.imageUrl,
    attributes: input.attributes,
    properties: {
      category: input.provenance.category,
      medium: input.provenance.medium,
      humanPolicy: "HUMAN_ Arts",
      verificationStatus: input.provenance.verificationStatus,
      evidenceHashes: input.provenance.evidenceHashes,
    },
  };

  const uploaded = await getStorageAdapter().uploadMetadataJson({
    objectKey: `${mintIntentId}.json`,
    metadata: metadataJson,
  });

  const warnings: string[] = [];
  const blockingIssueDetails: BlockingIssue[] = [];

  if (uploaded.warning) {
    warnings.push(uploaded.warning);
  }

  const mplCoreProgramId = process.env.SOLANA_METAPLEX_CORE_PROGRAM_ID;
  if (!mplCoreProgramId) {
    blockingIssueDetails.push(missingEnvIssue("SOLANA_METAPLEX_CORE_PROGRAM_ID", "Metaplex Core mint prepare"));
  }

  let unsignedTxBase64: string | undefined;
  const programIds: string[] = [];
  const notes: string[] = [];
  let assetPublicKey = "pending";

  if (blockingIssueDetails.length === 0) {
    try {
      const creator = publicKey(input.sellerWallet);
      const umi = createUmi(getRpcUrl()).use(signerIdentity(createNoopSigner(creator))).use(mplCore());
      const assetSigner = generateSigner(umi);
      assetPublicKey = toWeb3JsPublicKey(assetSigner.publicKey).toBase58();

      const builder = createV1(umi, {
        asset: assetSigner,
        name: input.title,
        uri: uploaded.uri,
        owner: creator,
        updateAuthority: creator,
      });

      const umiIx = builder.getInstructions();
      const tx = new Transaction();
      tx.feePayer = new PublicKey(input.sellerWallet);
      for (const ix of umiIx) {
        tx.add(toWeb3JsInstruction(ix));
      }

      try {
        const latest = await getSolanaConnection("confirmed").getLatestBlockhash("confirmed");
        tx.recentBlockhash = latest.blockhash;
      } catch (error) {
        blockingIssueDetails.push(
          rpcIssue("fetching recent blockhash for mint prepare", error instanceof Error ? error.message : "unknown"),
        );
      }

      if (blockingIssueDetails.length === 0) {
        tx.partialSign(toWeb3JsKeypair(assetSigner));
        unsignedTxBase64 = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString(
          "base64",
        );
      }

      programIds.push(new PublicKey(mplCoreProgramId!).toBase58());
      notes.push("Real mpl-core createV1 instruction prepared; creator wallet must co-sign and broadcast.");
    } catch (error) {
      blockingIssueDetails.push({
        code: "SDK_BUILD_FAILED",
        message: `Failed to build mpl-core createV1 instruction: ${error instanceof Error ? error.message : "unknown"}`,
        action: "Verify Metaplex package versions, program id, and payer/creator keys.",
      });
    }
  }

  return {
    mintIntentId,
    draftAssetId,
    metadataUri: uploaded.uri,
    mediaUri: input.imageUrl,
    metadataJson,
    visibility: "PRIVATE_REVIEW_ONLY",
    listable: false,
    provenanceSummary: {
      category: input.provenance.category,
      medium: input.provenance.medium,
      verificationStatus: input.provenance.verificationStatus,
    },
    warnings,
    blockingErrors: issuesToMessages(blockingIssueDetails),
    blockingIssueDetails,
    unsignedTxBase64,
    txInspection: {
      network: getRpcUrl(),
      payer: input.sellerWallet,
      programIds,
      accounts: {
        creator: input.sellerWallet,
        asset: assetPublicKey,
        coreProgram: mplCoreProgramId ?? "missing",
        metadataUri: uploaded.uri,
      },
      notes,
    },
    nextActions: [
      "Creator signs and broadcasts unsigned mint transaction.",
      "Wait for chain confirmation before treating asset as minted.",
      "Proceed to /api/list only once verification is VERIFIED_HUMAN.",
    ],
  };
}
