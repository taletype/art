import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

const retiredPurchaseResponse = {
  ok: false,
  message: "Purchase API deprecated - use thirdweb SDK for purchases",
};

async function expectRetiredPurchaseResponse(response: Response) {
  expect(response.status).toBe(410);
  await expect(response.json()).resolves.toEqual(retiredPurchaseResponse);
}

describe("purchase API route", () => {
  it("returns gone for legacy GET requests", async () => {
    await expectRetiredPurchaseResponse(await GET());
  });

  it("returns gone for legacy POST requests", async () => {
    await expectRetiredPurchaseResponse(await POST());
  });
});
