import FeaturedArtworks from "@/components/FeaturedArtworks";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black">
      <FeaturedArtworks />
    </main>
  );
}
