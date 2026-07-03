import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedAppUser, resolveMatchingSellerWallet } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const mixedCaseWallet = "0x1234567890ABCDEF1234567890aBcDeF12345678";
const mockCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);

function mockSupabaseUser(result: {
  data: {
    user: {
      id: string;
      email?: string | null;
      user_metadata?: Record<string, unknown>;
    } | null;
  };
  error: Error | null;
}) {
  mockCreateSupabaseServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue(result),
    },
  } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
}

describe("getAuthenticatedAppUser", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("trims a valid wallet address from user metadata", async () => {
    mockSupabaseUser({
      data: {
        user: {
          id: "user-1",
          email: "artist@example.test",
          user_metadata: { wallet_address: ` ${mixedCaseWallet} ` },
        },
      },
      error: null,
    });

    await expect(getAuthenticatedAppUser()).resolves.toEqual({
      id: "user-1",
      email: "artist@example.test",
      walletAddress: mixedCaseWallet,
    });
  });

  it("ignores invalid wallet metadata", async () => {
    mockSupabaseUser({
      data: {
        user: {
          id: "user-2",
          email: null,
          user_metadata: { wallet_address: "0x1234" },
        },
      },
      error: null,
    });

    await expect(getAuthenticatedAppUser()).resolves.toEqual({
      id: "user-2",
      email: null,
      walletAddress: null,
    });
  });
});

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
