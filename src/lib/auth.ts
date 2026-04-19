import { NextResponse } from "next/server";
import { isValidEvmAddress } from "@/lib/evmAddress";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthenticatedAppUser = {
  id: string;
  email: string | null;
  walletAddress: string | null;
};

export async function getAuthenticatedAppUser(): Promise<AuthenticatedAppUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const walletAddress =
    typeof data.user.user_metadata?.wallet_address === "string"
      ? data.user.user_metadata.wallet_address
      : null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    walletAddress: walletAddress && isValidEvmAddress(walletAddress) ? walletAddress : null,
  };
}

export function requireAuthenticatedAppUserResponse() {
  return NextResponse.json(
    { ok: false, message: "Sign in to continue." },
    { status: 401 },
  );
}

export function requireLinkedWalletResponse() {
  return NextResponse.json(
    { ok: false, message: "Add a valid Base Sepolia wallet address to your profile before selling." },
    { status: 400 },
  );
}

export function resolveSellerWallet(options: {
  profileWalletAddress: string | null;
  requestWalletAddress?: string | null;
}) {
  const requestWallet = options.requestWalletAddress?.trim() || null;
  if (requestWallet && isValidEvmAddress(requestWallet)) {
    return requestWallet;
  }

  return options.profileWalletAddress;
}

export function resolveMatchingSellerWallet(options: {
  profileWalletAddress: string | null;
  requestWalletAddress?: string | null;
}) {
  const profileWallet = options.profileWalletAddress?.trim() || null;
  if (!profileWallet || !isValidEvmAddress(profileWallet)) {
    return { wallet: null, mismatch: false };
  }

  const requestWallet = options.requestWalletAddress?.trim() || null;
  if (!requestWallet) {
    return { wallet: profileWallet, mismatch: false };
  }

  if (!isValidEvmAddress(requestWallet)) {
    return { wallet: null, mismatch: false };
  }

  if (requestWallet !== profileWallet) {
    return { wallet: null, mismatch: true };
  }

  return { wallet: profileWallet, mismatch: false };
}
