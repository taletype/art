import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

async function expectGoneResponse(response: Response, message: string) {
  expect(response.status).toBe(410);
  await expect(response.json()).resolves.toEqual({ ok: false, message });
}

describe("auctions API route", () => {
  it("returns gone for legacy GET requests", async () => {
    await expectGoneResponse(
      await GET(),
      "Supabase auction APIs are now legacy. Read live listings from the configured Thirdweb marketplace.",
    );
  });

  it("returns gone for legacy POST requests", async () => {
    await expectGoneResponse(
      await POST(),
      "Seller listing creation now happens through the Thirdweb marketplace flow in Seller Hub.",
    );
  });
});
