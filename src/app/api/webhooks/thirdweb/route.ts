import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Webhook } from "thirdweb/bridge";
import { getPurchaseStateStore, type PurchaseStateRecord } from "../../../../lib/purchaseStateStore";
import type { PurchaseState } from "../../../../types/art";

type JsonRecord = Record<string, unknown>;

const DEFAULT_TOLERANCE_SECONDS = 300;

function webhookSecret() {
  return process.env.THIRDWEB_WEBHOOK_SECRET?.trim() || process.env.THIRDWEB_SECRET_KEY?.trim() || "";
}

function webhookToleranceSeconds() {
  const parsed = Number(process.env.THIRDWEB_WEBHOOK_TOLERANCE_SECONDS ?? DEFAULT_TOLERANCE_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_TOLERANCE_SECONDS;
}

function lowerCaseHeaders(request: Request) {
  return Object.fromEntries([...request.headers.entries()].map(([key, value]) => [key.toLowerCase(), value]));
}

function hmacHex(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function normalizeSignature(signature: string) {
  return signature.trim().replace(/^sha256=/i, "").replace(/^v1=/i, "");
}

function signaturesMatch(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(normalizeSignature(received));
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function verifyManualThirdwebSignature(rawBody: string, headers: Record<string, string>, secret: string) {
  const signature =
    headers["x-webhook-signature"] ||
    headers["x-payload-signature"] ||
    headers["x-pay-signature"] ||
    headers["x-engine-signature"];

  if (!signature) {
    throw new Error("Missing Thirdweb webhook signature header.");
  }

  const timestamp = headers["x-timestamp"] || headers["x-pay-timestamp"] || headers["x-payload-timestamp"] || headers["x-engine-timestamp"];
  if (timestamp) {
    const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
    if (!Number.isFinite(ageSeconds) || ageSeconds > webhookToleranceSeconds()) {
      throw new Error("Thirdweb webhook timestamp is outside the allowed tolerance.");
    }
  }

  const signedPayloads = [rawBody];
  if (timestamp) {
    signedPayloads.push(`${timestamp}.${rawBody}`, `${timestamp}${rawBody}`);
  }

  if (!signedPayloads.some((payload) => signaturesMatch(hmacHex(payload, secret), signature))) {
    throw new Error("Invalid Thirdweb webhook signature.");
  }
}

async function parseVerifiedPayload(rawBody: string, headers: Record<string, string>, secret: string) {
  try {
    return await Webhook.parse(rawBody, headers, secret, webhookToleranceSeconds());
  } catch {
    verifyManualThirdwebSignature(rawBody, headers, secret);
    return JSON.parse(rawBody) as unknown;
  }
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function readString(record: JsonRecord | null, keys: string[]) {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function extractTransactionHash(data: JsonRecord | null) {
  const direct = readString(data, ["transactionHash", "txHash", "txSignature", "signature"]);
  if (direct) {
    return direct;
  }

  const transactions = data?.transactions;
  if (Array.isArray(transactions)) {
    for (const tx of transactions) {
      const hash = readString(asRecord(tx), ["transactionHash", "txHash", "hash", "signature"]);
      if (hash) {
        return hash;
      }
    }
  }

  return undefined;
}

function mapThirdwebStatus(status: string | undefined): PurchaseState | null {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
    case "COMPLETE":
    case "SUCCESS":
    case "SUCCEEDED":
      return "READY_TO_PURCHASE";
    case "FAILED":
    case "FAILURE":
    case "ERROR":
    case "CANCELED":
    case "CANCELLED":
    case "REVERTED":
      return "FAILED";
    case "PENDING":
    case "PROCESSING":
      return "NEEDS_FUNDING";
    default:
      return null;
  }
}

function extractPurchaseUpdate(payload: unknown) {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const purchaseData = asRecord(data?.purchaseData) ?? asRecord(root?.purchaseData);

  const idempotencyKey =
    readString(purchaseData, ["idempotencyKey", "humanArtsPurchaseKey", "purchaseStateKey"]) ??
    readString(data, ["idempotencyKey", "humanArtsPurchaseKey", "purchaseStateKey"]);

  const eventStatus = readString(data, ["status"]) ?? readString(root, ["status"]);
  const status = mapThirdwebStatus(eventStatus);

  return {
    idempotencyKey,
    status,
    txSignature: extractTransactionHash(data),
    purchaseData,
    eventStatus,
  };
}

export async function POST(request: Request) {
  const secret = webhookSecret();
  if (!secret) {
    return NextResponse.json(
      { ok: false, message: "THIRDWEB_WEBHOOK_SECRET is required for webhook verification." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const headers = lowerCaseHeaders(request);

  try {
    const payload = await parseVerifiedPayload(rawBody, headers, secret);
    const update = extractPurchaseUpdate(payload);

    if (!update.idempotencyKey || !update.status) {
      return NextResponse.json({
        ok: true,
        processed: false,
        message: "Verified Thirdweb webhook, but no purchase state update was present.",
        eventStatus: update.eventStatus,
      });
    }

    const store = getPurchaseStateStore();
    const existing = await store.get(update.idempotencyKey);
    const patch: Partial<PurchaseStateRecord> = {
      status: update.status,
      txSignature: update.txSignature,
      error: update.status === "FAILED" ? `Thirdweb funding event failed (${update.eventStatus ?? "unknown"})` : undefined,
    };

    const idempotencyKey = update.idempotencyKey;
    const nextRecord = existing
      ? await store.update(update.idempotencyKey, patch)
      : await store
          .upsert({
            idempotencyKey,
            status: update.status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            txSignature: update.txSignature,
            error: patch.error,
          })
          .then(() => store.get(idempotencyKey));

    return NextResponse.json({
      ok: true,
      processed: true,
      purchase: nextRecord,
      eventStatus: update.eventStatus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Invalid Thirdweb webhook.",
      },
      { status: 401 },
    );
  }
}
