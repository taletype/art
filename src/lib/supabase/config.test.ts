import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDatabaseUrl,
  getSupabasePublishableKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

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

describe("supabase config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads and trims the public Supabase URL", () => {
    clearSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", " https://example.supabase.co ");

    expect(getSupabaseUrl()).toBe("https://example.supabase.co");
  });

  it("falls back to the server Supabase URL", () => {
    clearSupabaseEnv();
    vi.stubEnv("SUPABASE_URL", "https://server.supabase.co");

    expect(getSupabaseUrl()).toBe("https://server.supabase.co");
  });

  it("skips .env.example Supabase URL placeholders before falling back", () => {
    clearSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://your-project-ref.supabase.co");
    vi.stubEnv("SUPABASE_URL", "https://server.supabase.co");

    expect(getSupabaseUrl()).toBe("https://server.supabase.co");
  });

  it("requires a Supabase URL", () => {
    clearSupabaseEnv();

    expect(() => getSupabaseUrl()).toThrow("Supabase is not configured");
  });

  it("reads publishable keys in documented fallback order", () => {
    clearSupabaseEnv();
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", " sb_publishable_server ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon_public");

    expect(getSupabasePublishableKey()).toBe("sb_publishable_server");
  });

  it("skips .env.example Supabase key placeholders before falling back", () => {
    clearSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_your_project_key");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon_server");

    expect(getSupabasePublishableKey()).toBe("anon_server");
  });

  it("requires a publishable or anon Supabase key", () => {
    clearSupabaseEnv();

    expect(() => getSupabasePublishableKey()).toThrow("Supabase is not configured");
  });

  it("does not treat .env.example placeholders as Supabase configuration", () => {
    clearSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://your-project-ref.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_your_project_key");

    expect(isSupabaseConfigured()).toBe(false);
    expect(() => getSupabaseUrl()).toThrow("Supabase is not configured");
    expect(() => getSupabasePublishableKey()).toThrow("Supabase is not configured");
  });

  it("detects Supabase configuration when URL and publishable key fallbacks are present", () => {
    clearSupabaseEnv();
    vi.stubEnv("SUPABASE_URL", "https://server.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon_server");

    expect(isSupabaseConfigured()).toBe(true);
  });

  it("detects missing Supabase configuration", () => {
    clearSupabaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");

    expect(isSupabaseConfigured()).toBe(false);
  });

  it("reads and trims the service role key", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", " service-role-key ");

    expect(getSupabaseServiceRoleKey()).toBe("service-role-key");
  });

  it("requires a real service role key for admin access", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "your_service_role_key");

    expect(() => getSupabaseServiceRoleKey()).toThrow("SUPABASE_SERVICE_ROLE_KEY is required");
  });

  it("requires the service role key for admin access", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    expect(() => getSupabaseServiceRoleKey()).toThrow("SUPABASE_SERVICE_ROLE_KEY is required");
  });

  it("reads database URLs in fallback order", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("POSTGRES_PRISMA_URL", " postgres://prisma ");
    vi.stubEnv("POSTGRES_URL", "postgres://direct");

    expect(getDatabaseUrl()).toBe("postgres://prisma");
  });

  it("falls back to the non-pooling database URL", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("POSTGRES_PRISMA_URL", "");
    vi.stubEnv("POSTGRES_URL", "");
    vi.stubEnv("POSTGRES_URL_NON_POOLING", " postgres://non-pooling ");

    expect(getDatabaseUrl()).toBe("postgres://non-pooling");
  });

  it("skips .env.example database URL placeholders before falling back", () => {
    vi.stubEnv("DATABASE_URL", "postgres://postgres:password@host:6543/postgres?sslmode=require");
    vi.stubEnv("POSTGRES_PRISMA_URL", "postgres://postgres:password@host:6543/postgres?sslmode=require&pgbouncer=true");
    vi.stubEnv("POSTGRES_URL", "postgres://direct");

    expect(getDatabaseUrl()).toBe("postgres://direct");
  });

  it("requires a database URL", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("POSTGRES_PRISMA_URL", "");
    vi.stubEnv("POSTGRES_URL", "");
    vi.stubEnv("POSTGRES_URL_NON_POOLING", "");

    expect(() => getDatabaseUrl()).toThrow("DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL, or POSTGRES_URL_NON_POOLING");
  });
});
