import AdminPanel from "@/components/AdminPanel";
import {
  getMarketplaceChainLabel,
  getMarketplaceContractAddress,
  getNftCollectionAddress,
} from "@/lib/thirdweb-config";

export const dynamic = "force-dynamic";

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function configuredValue(value: string) {
  return value || "Not set";
}

export default function AdminPage() {
  const adminWallet =
    readEnv("NEXT_PUBLIC_ADMIN_WALLET") ||
    readEnv("NEXT_PUBLIC_ADMIN_REVIEWER_WALLET") ||
    null;
  const deployUrl = readEnv("NEXT_PUBLIC_ONE_CLICK_DEPLOY_URL") || "https://vercel.com/new";
  const marketplaceAddress = getMarketplaceContractAddress();
  const collectionAddress = getNftCollectionAddress();

  return (
    <AdminPanel
      adminWallet={adminWallet}
      deployUrl={deployUrl}
      envStatus={[
        {
          label: "Admin wallet",
          configured: Boolean(adminWallet),
          value: configuredValue(adminWallet ?? ""),
        },
        {
          label: "Thirdweb client",
          configured: Boolean(readEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID")),
          value: configuredValue(readEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID")),
        },
        {
          label: "Chain",
          configured: true,
          value: getMarketplaceChainLabel(),
        },
        {
          label: "Marketplace",
          configured: Boolean(marketplaceAddress),
          value: configuredValue(marketplaceAddress ?? ""),
        },
        {
          label: "NFT collection",
          configured: Boolean(collectionAddress),
          value: configuredValue(collectionAddress ?? ""),
        },
        {
          label: "Deploy URL",
          configured: Boolean(deployUrl),
          value: deployUrl,
        },
      ]}
    />
  );
}
