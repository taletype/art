import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <main className="section-shell pb-20 pt-32">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-5">
          <p className="eyebrow">Seller + bidder onboarding</p>
          <h1 className="text-5xl leading-tight">Create a profile for auctions.</h1>
          <p className="text-lg leading-8 text-white/68">
            Create an optional app profile, or use a connected Thirdweb wallet directly. Seller Hub accepts either path for listings, auctions, and bids.
          </p>
          <p className="text-sm text-white/55">
            Already set up? <Link href="/login" className="text-white underline underline-offset-4">Log in instead</Link>.
          </p>
        </section>
        <AuthForm mode="signup" />
      </div>
    </main>
  );
}
