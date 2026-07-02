import { afterEach, describe, expect, it, vi } from "vitest";

const thirdwebMocks = vi.hoisted(() => ({
  createThirdwebClient: vi.fn((options: { clientId: string }) => ({
    clientId: options.clientId,
  })),
}));

vi.mock("thirdweb", () => ({
  createThirdwebClient: thirdwebMocks.createThirdwebClient,
}));

async function loadThirdwebModule() {
  vi.resetModules();
  return import("@/lib/thirdweb");
}

describe("thirdweb client", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("does not treat missing client ids as configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID", "");
    const { getThirdwebClient, isThirdwebClientConfigured } = await loadThirdwebModule();

    expect(isThirdwebClientConfigured()).toBe(false);
    expect(() => getThirdwebClient()).toThrow("NEXT_PUBLIC_THIRDWEB_CLIENT_ID is required");
    expect(thirdwebMocks.createThirdwebClient).not.toHaveBeenCalled();
  });

  it("does not treat .env.example placeholders as configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID", "your_thirdweb_client_id");
    const { getThirdwebClient, isThirdwebClientConfigured } = await loadThirdwebModule();

    expect(isThirdwebClientConfigured()).toBe(false);
    expect(() => getThirdwebClient()).toThrow("NEXT_PUBLIC_THIRDWEB_CLIENT_ID is required");
    expect(thirdwebMocks.createThirdwebClient).not.toHaveBeenCalled();
  });

  it("trims real client ids and caches the Thirdweb client", async () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID", " test-thirdweb-client ");
    const { getThirdwebClient, isThirdwebClientConfigured } = await loadThirdwebModule();

    expect(isThirdwebClientConfigured()).toBe(true);

    const client = getThirdwebClient();

    expect(client).toEqual({ clientId: "test-thirdweb-client" });
    expect(getThirdwebClient()).toBe(client);
    expect(thirdwebMocks.createThirdwebClient).toHaveBeenCalledTimes(1);
    expect(thirdwebMocks.createThirdwebClient).toHaveBeenCalledWith({ clientId: "test-thirdweb-client" });
  });
});
