import { createThirdwebClient } from "thirdweb";

const thirdwebClientPlaceholderValues = new Set(["your_thirdweb_client_id"]);

type ThirdwebClient = ReturnType<typeof createThirdwebClient>;

let cachedClient: { clientId: string; client: ThirdwebClient } | null = null;

function readThirdwebClientId() {
  return process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID?.trim() || "";
}

function isConfiguredThirdwebClientId(clientId: string) {
  return Boolean(clientId && !thirdwebClientPlaceholderValues.has(clientId.toLowerCase()));
}

export function isThirdwebClientConfigured() {
  return isConfiguredThirdwebClientId(readThirdwebClientId());
}

export function getThirdwebClient() {
  const clientId = readThirdwebClientId();
  if (!isConfiguredThirdwebClientId(clientId)) {
    throw new Error("NEXT_PUBLIC_THIRDWEB_CLIENT_ID is required");
  }

  if (cachedClient?.clientId === clientId) {
    return cachedClient.client;
  }

  const client = createThirdwebClient({ clientId });
  cachedClient = { clientId, client };
  return client;
}
