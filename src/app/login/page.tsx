import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import LoginAccessPanel from "@/components/LoginAccessPanel";

export default function LoginPage() {
  return (
    <main className="section-shell pb-20 pt-32">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-5">
          <p className="eyebrow">Collector access</p>
          <h1 className="text-5xl leading-tight">Log in and start bidding.</h1>
          <p className="text-lg leading-8 text-white/68">
            Use an app account or connect with Thirdweb. Either path works for Base Sepolia listings, bids, buyouts, and Seller Hub.
          </p>
          <p className="text-sm text-white/55">
            Need an account? <Link href="/signup" className="text-white underline underline-offset-4">Create one here</Link>.
          </p>
        </section>
        <div className="grid gap-5">
          <AuthForm mode="login" />
          <LoginAccessPanel />
        </div>
      </div>
    </main>
  );
}
