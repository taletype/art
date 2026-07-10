import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase/browser";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn((url: string, key: string) => ({ key, url })),
}));

const browserSupabaseEnvNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

function clearBrowserSupabaseEnv() {
  for (const name of browserSupabaseEnvNames) {
    vi.stubEnv(name, "");
  }
}

describe("supabase browser client", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("reads and trims browser-safe Supabase configuration", () => {
    clearBrowserSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", " https://example.supabase.co ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", " sb_publishable_real_key ");

    expect(isSupabaseBrowserConfigured()).toBe(true);
    expect(getSupabaseBrowserClient()).toEqual({
      key: "sb_publishable_real_key",
      url: "https://example.supabase.co",
    });
    expect(createBrowserClient).toHaveBeenCalledWith("https://example.supabase.co", "sb_publishable_real_key");
  });

  it("reuses the browser client while the Supabase configuration is unchanged", () => {
    clearBrowserSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://cache-test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_cache_key");

    const firstClient = getSupabaseBrowserClient();
    const secondClient = getSupabaseBrowserClient();

    expect(secondClient).toBe(firstClient);
    expect(createBrowserClient).toHaveBeenCalledTimes(1);
  });

  it("creates a new browser client when the Supabase configuration changes", () => {
    clearBrowserSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://refresh-first.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_refresh_first_key");

    const firstClient = getSupabaseBrowserClient();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://refresh-second.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_refresh_second_key");
    const secondClient = getSupabaseBrowserClient();

    expect(secondClient).toEqual({
      key: "sb_publishable_refresh_second_key",
      url: "https://refresh-second.supabase.co",
    });
    expect(secondClient).not.toBe(firstClient);
    expect(createBrowserClient).toHaveBeenCalledTimes(2);
    expect(createBrowserClient).toHaveBeenNthCalledWith(1, "https://refresh-first.supabase.co", "sb_publishable_refresh_first_key");
    expect(createBrowserClient).toHaveBeenNthCalledWith(2, "https://refresh-second.supabase.co", "sb_publishable_refresh_second_key");
  });

  it("falls back to the browser anon key", () => {
    clearBrowserSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon_public");

    expect(isSupabaseBrowserConfigured()).toBe(true);
    expect(getSupabaseBrowserClient()).toEqual({
      key: "anon_public",
      url: "https://example.supabase.co",
    });
  });

  it("skips a publishable key placeholder before falling back to the browser anon key", () => {
    clearBrowserSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder-fallback.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_your_project_key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon_placeholder_fallback");

    expect(isSupabaseBrowserConfigured()).toBe(true);
    expect(getSupabaseBrowserClient()).toEqual({
      key: "anon_placeholder_fallback",
      url: "https://placeholder-fallback.supabase.co",
    });
    expect(createBrowserClient).toHaveBeenCalledWith("https://placeholder-fallback.supabase.co", "anon_placeholder_fallback");
  });

  it("does not treat .env.example placeholders as browser Supabase configuration", () => {
    clearBrowserSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://your-project-ref.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_your_project_key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "legacy_anon_key_if_needed");

    expect(isSupabaseBrowserConfigured()).toBe(false);
    expect(() => getSupabaseBrowserClient()).toThrow("Supabase is not configured");
    expect(createBrowserClient).not.toHaveBeenCalled();
  });

  it("requires both a browser Supabase URL and key", () => {
    clearBrowserSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");

    expect(isSupabaseBrowserConfigured()).toBe(false);
    expect(() => getSupabaseBrowserClient()).toThrow("Supabase is not configured");
    expect(createBrowserClient).not.toHaveBeenCalled();
  });
});
