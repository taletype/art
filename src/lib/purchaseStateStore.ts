import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { PurchaseState } from "../types/art";

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

const configuredPath = process.env.PURCHASE_STATE_FILE;
const dataFile = configuredPath
  ? resolve(process.cwd(), configuredPath)
  : resolve(process.cwd(), ".data", "purchase-state.json");

let singleton: PurchaseStateStore | null = null;

export function getPurchaseStateStore(): PurchaseStateStore {
  if (!singleton) {
    singleton = new FilePurchaseStateStore(dataFile);
  }
  return singleton;
}
