import { NextResponse } from "next/server";
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
    walletAddress,
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
    { ok: false, message: "Connect a thirdweb wallet and save it to your profile before selling." },
    { status: 400 },
  );
}
