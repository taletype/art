import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedAppUser } from "@/lib/auth";
import { createSellerArtwork } from "@/lib/seller";
import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedAppUser: vi.fn(),
}));

vi.mock("@/lib/seller", () => ({
  createSellerArtwork: vi.fn(),
}));

const mockGetAuthenticatedAppUser = vi.mocked(getAuthenticatedAppUser);
const mockCreateSellerArtwork = vi.mocked(createSellerArtwork);
const sellerWallet = "0x1234567890abcdef1234567890abcdef12345678";

function makeMintRequest(body: Record<string, unknown>) {
  return new NextRequest("https://example.test/api/mint", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawMintRequest(body: string) {
  return new NextRequest("https://example.test/api/mint", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("mint API POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedAppUser.mockResolvedValue(null);
    mockCreateSellerArtwork.mockResolvedValue({ id: "artwork-id" });
  });

  it("returns bad request for malformed JSON without opening auth or seller clients", async () => {
    const response = await POST(makeRawMintRequest("{"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ ok: false, message: "Invalid JSON payload" });
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSellerArtwork).not.toHaveBeenCalled();
  });

  it("returns validation errors without opening auth or seller clients", async () => {
    const response = await POST(makeMintRequest({ title: "A" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ ok: false, message: "Invalid seller payload" });
    expect(body.issues.length).toBeGreaterThan(0);
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSellerArtwork).not.toHaveBeenCalled();
  });

  it("creates a draft artwork for a valid wallet-backed request", async () => {
    const response = await POST(
      makeMintRequest({
        title: "Verified studio work",
        description: "A handmade work with provenance notes ready for review.",
        imageUrl: "https://example.test/artwork.png",
        sellerWallet,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ ok: true, artwork: { id: "artwork-id" } });
    expect(mockGetAuthenticatedAppUser).toHaveBeenCalledOnce();
    expect(mockCreateSellerArtwork).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: null,
        sellerWallet,
        title: "Verified studio work",
        imageUrl: "https://example.test/artwork.png",
      }),
    );
  });
});
