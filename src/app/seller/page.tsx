import { redirect } from "next/navigation";
import SellerDashboard from "@/components/SellerDashboard";
import { getAuthenticatedAppUser } from "@/lib/auth";
import { listSellerArtworks } from "@/lib/seller";

export const dynamic = "force-dynamic";

export default async function SellerPage() {
  const user = await getAuthenticatedAppUser();

  if (!user) {
    redirect("/login");
  }

  const artworks = await listSellerArtworks(user.id);

  return <SellerDashboard email={user.email} walletAddress={user.walletAddress} artworks={artworks} />;
}
