import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0e0e0e]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-white/60 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>© 2026 RealArt Auctions</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/sales/contemporary-digital-asia" className="hover:text-white">Sales</Link>
          <Link href="/submit" className="hover:text-white">List</Link>
        </div>
      </div>
    </footer>
  );
}
