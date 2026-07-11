import { describe, expect, it } from "vitest";
import { POST } from "./route";

const inactiveWebhookResponse = {
  ok: false,
  message:
    "Thirdweb webhook handling is inactive; purchase state is handled by live marketplace flows.",
};

describe("thirdweb webhook API route", () => {
  it("returns not implemented while webhook handling is inactive", async () => {
    const response = await POST();

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual(inactiveWebhookResponse);
  });
});
