"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              wallet_address: walletAddress.trim() || null,
            },
          },
        });
        if (error) {
          throw error;
        }
        setMessage("Account created. Check your inbox if email confirmation is enabled, then connect your thirdweb wallet from Seller Hub.");
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
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
            Wallet address
          </label>
          <input
            id="signup-wallet"
            type="text"
            value={walletAddress}
            onChange={(event) => setWalletAddress(event.target.value)}
            className="field-input"
            placeholder="Optional now, editable later from your auction profile"
          />
        </div>
      ) : null}

      <button type="submit" className="button-primary w-full disabled:cursor-wait disabled:opacity-70" disabled={pending}>
        {pending ? "Working..." : mode === "signup" ? "Create account" : "Log in"}
      </button>

      {message ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">{message}</p>
      ) : null}
    </form>
  );
}
