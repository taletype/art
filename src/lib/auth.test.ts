import { describe, expect, it } from "vitest";
import { resolveMatchingSellerWallet } from "@/lib/auth";

const mixedCaseWallet = "0x1234567890ABCDEF1234567890aBcDeF12345678";

describe("resolveMatchingSellerWallet", () => {
  it("matches the same EVM address regardless of casing", () => {
    expect(
      resolveMatchingSellerWallet({
        profileWalletAddress: mixedCaseWallet,
        requestWalletAddress: mixedCaseWallet.toLowerCase(),
      }),
    ).toEqual({ wallet: mixedCaseWallet, mismatch: false });
  });

  it("flags a different valid EVM address as a mismatch", () => {
    expect(
      resolveMatchingSellerWallet({
        profileWalletAddress: mixedCaseWallet,
        requestWalletAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      }),
    ).toEqual({ wallet: null, mismatch: true });
  });
});
