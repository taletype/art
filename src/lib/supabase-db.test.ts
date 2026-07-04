import { afterEach, describe, expect, it, vi } from "vitest";

const supabaseEnvNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
] as const;

function clearSupabaseEnv() {
  for (const name of supabaseEnvNames) {
    vi.stubEnv(name, "");
  }
}

describe("supabase db read helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns empty collections when Supabase is not configured", async () => {
    clearSupabaseEnv();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { listArtworks, listCreators, listSales } = await import("@/lib/supabase-db");

    await expect(listArtworks()).resolves.toEqual([]);
    await expect(listSales()).resolves.toEqual([]);
    await expect(listCreators()).resolves.toEqual([]);
    expect(consoleError).toHaveBeenCalledTimes(3);
  });

  it("returns null detail records when Supabase is not configured", async () => {
    clearSupabaseEnv();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getArtworkById, getCreatorByWallet, getSaleById } = await import("@/lib/supabase-db");

    await expect(getArtworkById("artwork-1")).resolves.toBeNull();
    await expect(getSaleById("sale-1")).resolves.toBeNull();
    await expect(getCreatorByWallet("0x123")).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalledTimes(3);
  });
});
