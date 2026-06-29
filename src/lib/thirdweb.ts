import { createThirdwebClient } from "thirdweb";

const thirdwebClientPlaceholderValues = new Set(["your_thirdweb_client_id"]);

let cachedClient: ReturnType<typeof createThirdwebClient> | null = null;

function readThirdwebClientId() {
  return process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID?.trim() || "";
}

export function isThirdwebClientConfigured() {
  const clientId = readThirdwebClientId();
  return Boolean(clientId && !thirdwebClientPlaceholderValues.has(clientId.toLowerCase()));
}

export function getThirdwebClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const clientId = readThirdwebClientId();
  if (!isThirdwebClientConfigured()) {
    throw new Error("NEXT_PUBLIC_THIRDWEB_CLIENT_ID is required");
  }

  cachedClient = createThirdwebClient({ clientId });
  return cachedClient;
}