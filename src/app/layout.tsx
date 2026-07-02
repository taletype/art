import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ThirdwebProviderWrapper from "@/components/ThirdwebProviderWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUMAN_ Arts",
  description: "Premium digital auction house for verified human-made artwork and curated sale catalogs.",
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
        <ThirdwebProviderWrapper>
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
        </ThirdwebProviderWrapper>
      </body>
    </html>
  );
}
