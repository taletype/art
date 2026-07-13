import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

const retiredMintListResponse = {
  ok: false,
  message:
    "Server-side mint/list API is retired. Use Seller Hub wallet-signed minting and marketplace listing instead.",
};

async function expectRetiredMintListResponse(response: Response) {
  expect(response.status).toBe(410);
  await expect(response.json()).resolves.toEqual(retiredMintListResponse);
}

describe("mint-list API route", () => {
  it("returns gone for legacy GET requests", async () => {
    await expectRetiredMintListResponse(await GET());
  });

  it("returns gone for legacy POST requests", async () => {
    await expectRetiredMintListResponse(await POST());
  });
});
