import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedAppUser, resolveMatchingSellerWallet } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const mixedCaseWallet = "0x1234567890ABCDEF1234567890aBcDeF12345678";
const mockIsSupabaseConfigured = vi.mocked(isSupabaseConfigured);
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
    mockIsSupabaseConfigured.mockReturnValue(true);
  });

  it("returns null without creating a Supabase client when Supabase is not configured", async () => {
    mockIsSupabaseConfigured.mockReturnValue(false);

    await expect(getAuthenticatedAppUser()).resolves.toBeNull();
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
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