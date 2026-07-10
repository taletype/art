import { describe, expect, it } from "vitest";
import { POST } from "./route";

const retiredMintListResponse = {
  ok: false,
  message:
    "Server-side mint/list API is retired. Use Seller Hub wallet-signed minting and marketplace listing instead.",
};

describe("mint-list API route", () => {
  it("returns gone for legacy POST requests", async () => {
    const response = await POST();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual(retiredMintListResponse);
  });
});
