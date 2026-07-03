import SellerDashboard from "@/components/SellerDashboard";
import { getSellerDashboardData } from "@/lib/sellerDashboardData";

export const dynamic = "force-dynamic";

export default async function SellerPage() {
  const dashboardData = await getSellerDashboardData();

  return <SellerDashboard {...dashboardData} />;
}
