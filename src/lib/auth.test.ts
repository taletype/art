import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAuthenticatedAppUser,
  requireAuthenticatedAppUserResponse,
  requireLinkedWalletResponse,
  resolveMatchingSellerWallet,
  resolveSellerWallet,
} from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const mixedCaseWallet = "0x1234567890ABCDEF1234567890aBcDeF12345678";
const requestWallet = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
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

  it("returns null when Supabase cannot resolve a signed-in user", async () => {
    mockSupabaseUser({
      data: { user: null },
      error: null,
    });

    await expect(getAuthenticatedAppUser()).resolves.toBeNull();

    mockSupabaseUser({
      data: { user: null },
      error: new Error("Session expired"),
    });

    await expect(getAuthenticatedAppUser()).resolves.toBeNull();
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

describe("auth response helpers", () => {
  it("returns the shared sign-in required response", async () => {
    const response = requireAuthenticatedAppUserResponse();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: "Sign in to continue.",
    });
  });

  it("returns the linked-wallet required response", async () => {
    const response = requireLinkedWalletResponse();

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: "Add a valid Base Sepolia wallet address to your profile before selling.",
    });
  });
});

describe("resolveSellerWallet", () => {
  it("uses a valid request wallet when one is provided", () => {
    expect(
      resolveSellerWallet({
        profileWalletAddress: mixedCaseWallet,
        requestWalletAddress: ` ${requestWallet} `,
      }),
    ).toBe(requestWallet);
  });

  it("falls back to the profile wallet when the request wallet is missing or invalid", () => {
    expect(resolveSellerWallet({ profileWalletAddress: mixedCaseWallet })).toBe(mixedCaseWallet);
    expect(
      resolveSellerWallet({
        profileWalletAddress: mixedCaseWallet,
        requestWalletAddress: "0x1234",
      }),
    ).toBe(mixedCaseWallet);
  });
});

describe("resolveMatchingSellerWallet", () => {
  it("uses the profile wallet when no request wallet is provided", () => {
    expect(resolveMatchingSellerWallet({ profileWalletAddress: mixedCaseWallet })).toEqual({
      wallet: mixedCaseWallet,
      mismatch: false,
    });
  });

  it("matches the same EVM address regardless of casing", () => {
    expect(
      resolveMatchingSellerWallet({
        profileWalletAddress: mixedCaseWallet,
        requestWalletAddress: mixedCaseWallet.toLowerCase(),
      }),
    ).toEqual({ wallet: mixedCaseWallet, mismatch: false });
  });

  it("ignores invalid request wallets without reporting a mismatch", () => {
    expect(
      resolveMatchingSellerWallet({
        profileWalletAddress: mixedCaseWallet,
        requestWalletAddress: "0x1234",
      }),
    ).toEqual({ wallet: null, mismatch: false });
  });

  it("flags a different valid EVM address as a mismatch", () => {
    expect(
      resolveMatchingSellerWallet({
        profileWalletAddress: mixedCaseWallet,
        requestWalletAddress: requestWallet,
      }),
    ).toEqual({ wallet: null, mismatch: true });
  });
});
