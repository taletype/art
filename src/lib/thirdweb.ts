import { createThirdwebClient } from "thirdweb";

let cachedClient: ReturnType<typeof createThirdwebClient> | null = null;

export function getThirdwebClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_THIRDWEB_CLIENT_ID is required");
  }

  cachedClient = createThirdwebClient({ clientId });
  return cachedClient;
}
