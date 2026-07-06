import AdminPanel from "@/components/AdminPanel";
import { isValidEvmAddress } from "@/lib/evmAddress";
import {
  getMarketplaceChainConfigLabel,
  getMarketplaceContractAddress,
  getNftCollectionAddress,
  isMarketplaceChainConfigured,
} from "@/lib/thirdweb-config";
import { isThirdwebClientConfigured } from "@/lib/thirdweb";

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
  const adminWalletConfigured = Boolean(adminWallet && isValidEvmAddress(adminWallet));
  const marketplaceDeployUrl =
    readEnv("NEXT_PUBLIC_THIRDWEB_MARKETPLACE_DEPLOY_URL") ||
    "https://thirdweb.com/thirdweb.eth/MarketplaceV3";
  const collectionDeployUrl =
    readEnv("NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_DEPLOY_URL") ||
    "https://thirdweb.com/thirdweb.eth/TokenERC721";
  const marketplaceAddress = getMarketplaceContractAddress();
  const collectionAddress = getNftCollectionAddress();

  return (
    <AdminPanel
      adminWallet={adminWalletConfigured ? adminWallet : null}
      marketplaceDeployUrl={marketplaceDeployUrl}
      collectionDeployUrl={collectionDeployUrl}
      envStatus={[
        {
          label: "Admin wallet",
          configured: adminWalletConfigured,
          value: configuredValue(adminWallet ?? ""),
        },
        {
          label: "Thirdweb client",
          configured: isThirdwebClientConfigured(),
          value: configuredValue(readEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID")),
        },
        {
          label: "Chain",
          configured: isMarketplaceChainConfigured(),
          value: getMarketplaceChainConfigLabel(),
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
          label: "Marketplace deploy",
          configured: Boolean(marketplaceDeployUrl),
          value: marketplaceDeployUrl,
        },
        {
          label: "Collection deploy",
          configured: Boolean(collectionDeployUrl),
          value: collectionDeployUrl,
        },
      ]}
    />
  );
}
