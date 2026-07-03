import { getAuthenticatedAppUser } from "@/lib/auth";
import { listSellerArtworks, listSellerArtworksByWallet } from "@/lib/seller";

export async function getSellerDashboardData() {
  const user = await getAuthenticatedAppUser();
  const ownerArtworks = user ? await listSellerArtworks(user.id) : [];
  const walletArtworks = user?.walletAddress ? await listSellerArtworksByWallet(user.walletAddress) : [];
  const artworks = Array.from(
    new Map([...ownerArtworks, ...walletArtworks].map((artwork) => [artwork.id, artwork])).values(),
  );

  return {
    email: user?.email ?? null,
    walletAddress: user?.walletAddress ?? null,
    artworks,
  };
}
