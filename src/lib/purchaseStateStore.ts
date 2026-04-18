import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { PurchaseState } from "../types/art";
import { createSupabaseAdminClient } from "./supabase/admin";
import { isSupabaseConfigured } from "./supabase/config";

export interface PurchaseStateRecord {
  idempotencyKey: string;
  status: PurchaseState;
  createdAt: string;
  updatedAt: string;
  txSignature?: string;
  error?: string;
  txContext?: {
    listingId: string;
    assetId: string;
    buyerWallet: string;
    sellerWallet: string;
    treasuryMint: string;
    priceLamports: number;
    expectedAuctionHouse: string;
    expectedMintOrAsset: string;
    expiresAt: string;
  };
}

export interface PurchaseStateStore {
  get(idempotencyKey: string): Promise<PurchaseStateRecord | null>;
  create(record: PurchaseStateRecord): Promise<void>;
  update(idempotencyKey: string, patch: Partial<PurchaseStateRecord>): Promise<PurchaseStateRecord | null>;
  upsert(record: PurchaseStateRecord): Promise<void>;
}

function readRetentionMs() {
  const raw = Number(process.env.PURCHASE_STATE_RETENTION_MS ?? 1000 * 60 * 60 * 24 * 7);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1000 * 60 * 60 * 24 * 7;
}

class FilePurchaseStateStore implements PurchaseStateStore {
  private writeChain: Promise<void> = Promise.resolve();
  private readonly retentionMs = readRetentionMs();

  constructor(private readonly filePath: string) {}

  private async readAll(): Promise<Record<string, PurchaseStateRecord>> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, PurchaseStateRecord>;
      return this.pruneExpired(parsed);
    } catch {
      return {};
    }
  }

  private pruneExpired(data: Record<string, PurchaseStateRecord>) {
    const now = Date.now();
    const next: Record<string, PurchaseStateRecord> = {};

    for (const [key, record] of Object.entries(data)) {
      const updatedAt = Date.parse(record.updatedAt || record.createdAt);
      const expiresAt = record.txContext?.expiresAt ? Date.parse(record.txContext.expiresAt) : Number.NaN;
      const isRetentionExpired = Number.isFinite(updatedAt) ? now - updatedAt > this.retentionMs : false;
      const isContextExpired = Number.isFinite(expiresAt) ? expiresAt < now && record.status !== "TX_CONFIRMED" : false;

      if (!isRetentionExpired && !isContextExpired) {
        next[key] = record;
      }
    }

    return next;
  }

  private async writeAll(data: Record<string, PurchaseStateRecord>) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(tmpPath, JSON.stringify(this.pruneExpired(data), null, 2), "utf8");
    await rename(tmpPath, this.filePath);
    await rm(tmpPath, { force: true }).catch(() => undefined);
  }

  private async queueWrite<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.writeChain;
    let release: () => void = () => {};
    this.writeChain = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async get(idempotencyKey: string): Promise<PurchaseStateRecord | null> {
    const data = await this.readAll();
    return data[idempotencyKey] ?? null;
  }

  async create(record: PurchaseStateRecord): Promise<void> {
    await this.queueWrite(async () => {
      const data = await this.readAll();
      if (data[record.idempotencyKey]) {
        throw new Error(`Purchase state already exists for ${record.idempotencyKey}`);
      }
      data[record.idempotencyKey] = record;
      await this.writeAll(data);
    });
  }

  async update(
    idempotencyKey: string,
    patch: Partial<PurchaseStateRecord>,
  ): Promise<PurchaseStateRecord | null> {
    return this.queueWrite(async () => {
      const data = await this.readAll();
      const existing = data[idempotencyKey];
      if (!existing) {
        return null;
      }

      const updated: PurchaseStateRecord = {
        ...existing,
        ...patch,
        idempotencyKey,
        updatedAt: new Date().toISOString(),
      };

      data[idempotencyKey] = updated;
      await this.writeAll(data);
      return updated;
    });
  }

  async upsert(record: PurchaseStateRecord): Promise<void> {
    await this.queueWrite(async () => {
      const data = await this.readAll();
      const existing = data[record.idempotencyKey];
      data[record.idempotencyKey] = {
        ...existing,
        ...record,
        updatedAt: record.updatedAt ?? new Date().toISOString(),
      };
      await this.writeAll(data);
    });
  }
}

type PurchaseStateRow = {
  idempotency_key: string;
  status: PurchaseState;
  created_at: string;
  updated_at: string;
  tx_signature: string | null;
  error: string | null;
  tx_context: PurchaseStateRecord["txContext"] | null;
};

function tableName() {
  return process.env.PURCHASE_STATE_TABLE?.trim() || "purchase_states";
}

function hasSupabaseAdminConfig() {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function toRow(record: PurchaseStateRecord): PurchaseStateRow {
  return {
    idempotency_key: record.idempotencyKey,
    status: record.status,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    tx_signature: record.txSignature ?? null,
    error: record.error ?? null,
    tx_context: record.txContext ?? null,
  };
}

function fromRow(row: PurchaseStateRow): PurchaseStateRecord {
  return {
    idempotencyKey: row.idempotency_key,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    txSignature: row.tx_signature ?? undefined,
    error: row.error ?? undefined,
    txContext: row.tx_context ?? undefined,
  };
}

class SupabasePurchaseStateStore implements PurchaseStateStore {
  constructor(private readonly fallback: PurchaseStateStore) {}

  private client() {
    return createSupabaseAdminClient();
  }

  private async runWithFallback<T>(operation: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    if (!hasSupabaseAdminConfig()) {
      return fallback();
    }

    try {
      return await operation();
    } catch (error) {
      console.warn("Supabase purchase state unavailable; falling back to file store.", error);
      return fallback();
    }
  }

  async get(idempotencyKey: string): Promise<PurchaseStateRecord | null> {
    return this.runWithFallback(
      async () => {
        const { data, error } = await this.client()
          .from(tableName())
          .select("idempotency_key,status,created_at,updated_at,tx_signature,error,tx_context")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle<PurchaseStateRow>();

        if (error) {
          throw error;
        }

        return data ? fromRow(data) : null;
      },
      () => this.fallback.get(idempotencyKey),
    );
  }

  async create(record: PurchaseStateRecord): Promise<void> {
    return this.runWithFallback(
      async () => {
        const { error } = await this.client().from(tableName()).insert(toRow(record));
        if (error) {
          throw error;
        }
      },
      () => this.fallback.create(record),
    );
  }

  async update(
    idempotencyKey: string,
    patch: Partial<PurchaseStateRecord>,
  ): Promise<PurchaseStateRecord | null> {
    return this.runWithFallback(
      async () => {
        const existing = await this.get(idempotencyKey);
        if (!existing) {
          return null;
        }

        const updated: PurchaseStateRecord = {
          ...existing,
          ...patch,
          idempotencyKey,
          updatedAt: new Date().toISOString(),
        };

        const { data, error } = await this.client()
          .from(tableName())
          .update(toRow(updated))
          .eq("idempotency_key", idempotencyKey)
          .select("idempotency_key,status,created_at,updated_at,tx_signature,error,tx_context")
          .maybeSingle<PurchaseStateRow>();

        if (error) {
          throw error;
        }

        return data ? fromRow(data) : null;
      },
      () => this.fallback.update(idempotencyKey, patch),
    );
  }

  async upsert(record: PurchaseStateRecord): Promise<void> {
    return this.runWithFallback(
      async () => {
        const { error } = await this.client()
          .from(tableName())
          .upsert(toRow(record), { onConflict: "idempotency_key" });

        if (error) {
          throw error;
        }
      },
      () => this.fallback.upsert(record),
    );
  }
}

const configuredPath = process.env.PURCHASE_STATE_FILE;
const dataFile = configuredPath
  ? resolve(process.cwd(), configuredPath)
  : resolve(process.cwd(), ".data", "purchase-state.json");

let singleton: PurchaseStateStore | null = null;

export function getPurchaseStateStore(): PurchaseStateStore {
  if (!singleton) {
    const fileStore = new FilePurchaseStateStore(dataFile);
    singleton =
      process.env.PURCHASE_STATE_BACKEND === "file"
        ? fileStore
        : new SupabasePurchaseStateStore(fileStore);
  }
  return singleton;
}
