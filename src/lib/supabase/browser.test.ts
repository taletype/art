import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

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

    expect(getSupabaseBrowserClient()).toEqual({
      key: "sb_publishable_real_key",
      url: "https://example.supabase.co",
    });
    expect(createBrowserClient).toHaveBeenCalledWith("https://example.supabase.co", "sb_publishable_real_key");
  });

  it("falls back to the browser anon key", () => {
    clearBrowserSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon_public");

    expect(getSupabaseBrowserClient()).toEqual({
      key: "anon_public",
      url: "https://example.supabase.co",
    });
  });

  it("skips a publishable key placeholder before falling back to the browser anon key", () => {
    clearBrowserSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_your_project_key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon_public");

    expect(getSupabaseBrowserClient()).toEqual({
      key: "anon_public",
      url: "https://example.supabase.co",
    });
    expect(createBrowserClient).toHaveBeenCalledWith("https://example.supabase.co", "anon_public");
  });

  it("does not treat .env.example placeholders as browser Supabase configuration", () => {
    clearBrowserSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://your-project-ref.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_your_project_key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "legacy_anon_key_if_needed");

    expect(() => getSupabaseBrowserClient()).toThrow("Supabase is not configured");
    expect(createBrowserClient).not.toHaveBeenCalled();
  });
});
