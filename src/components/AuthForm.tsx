"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { isValidSolanaAddress } from "@/lib/solanaAddress";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthFormProps = {
  mode: "login" | "signup";
};

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const supabase = getSupabaseBrowserClient();
    try {
      if (mode === "signup") {
        const normalizedWallet = walletAddress.trim();
        if (normalizedWallet && !isValidSolanaAddress(normalizedWallet)) {
          throw new Error("Enter a valid Solana wallet address or leave it blank for now.");
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              wallet_address: normalizedWallet || null,
            },
          },
        });
        if (error) {
          throw error;
        }
        setMessage("Account created. Check your inbox if email confirmation is enabled, then add your Solana devnet wallet from Seller Hub.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
        router.push("/seller");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-[2rem] border border-[#d4af37]/20 bg-white/[0.04] p-8 backdrop-blur-xl shadow-2xl shadow-black/40">
      <div>
        <label htmlFor={`${mode}-email`} className="field-label">
          Email
        </label>
        <input
          id={`${mode}-email`}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="field-input"
          required
        />
      </div>

      <div>
        <label htmlFor={`${mode}-password`} className="field-label">
          Password
        </label>
        <input
          id={`${mode}-password`}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field-input"
          minLength={8}
          required
        />
      </div>

      {mode === "signup" ? (
        <div>
          <label htmlFor="signup-wallet" className="field-label">
            Solana wallet address
          </label>
          <input
            id="signup-wallet"
            type="text"
            value={walletAddress}
            onChange={(event) => setWalletAddress(event.target.value)}
            className="field-input"
            placeholder="Optional now, editable later from your seller profile"
          />
        </div>
      ) : null}

      <button type="submit" className="button-primary w-full disabled:cursor-wait disabled:opacity-60" disabled={pending}>
        {pending ? "Processing..." : mode === "signup" ? "Create account" : "Log in"}
      </button>

      {message ? (
        <p className="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/5 px-4 py-3 text-sm text-white/90 backdrop-blur-sm">{message}</p>
      ) : null}
    </form>
  );
}
