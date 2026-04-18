import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUMAN_ Arts - Human-Created Digital Art on Solana",
  description:
    "A curated Solana marketplace for original digital art by verified human artists. Discover, collect, and support creators.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0b0b0d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden bg-black text-white antialiased">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div className="relative min-h-screen">
          <Navigation />
          <div id="main-content" className="relative z-10">
            {children}
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
