import { getAuthenticatedAppUser } from "@/lib/auth";
import { listSellerArtworks, listSellerArtworksByWallet } from "@/lib/seller";

export async function getSellerDashboardData() {
  const user = await getAuthenticatedAppUser();
  const [ownerArtworks, walletArtworks] = await Promise.all([
    user ? listSellerArtworks(user.id) : Promise.resolve([]),
    user?.walletAddress ? listSellerArtworksByWallet(user.walletAddress) : Promise.resolve([]),
  ]);
  const artworks = Array.from(
    new Map([...ownerArtworks, ...walletArtworks].map((artwork) => [artwork.id, artwork])).values(),
  );

  return {
    email: user?.email ?? null,
    walletAddress: user?.walletAddress ?? null,
    artworks,
  };
}
