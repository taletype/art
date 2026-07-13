import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const supabaseEnvNames = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

function runMigrationWithEnv(envOverrides: Record<string, string>) {
  const env = { ...process.env, ...envOverrides };

  for (const name of supabaseEnvNames) {
    env[name] ??= "";
  }

  return spawnSync(process.execPath, [join(process.cwd(), "scripts/run-migration.mjs")], {
    cwd: process.cwd(),
    encoding: "utf8",
    env,
  });
}

describe("migration runner", () => {
  it("fails fast when Supabase URL configuration is missing", () => {
    const result = runMigrationWithEnv({
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      SUPABASE_URL: "",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing required environment variable: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  });

  it("treats copied Supabase URL placeholders as missing configuration", () => {
    const result = runMigrationWithEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://your-project-ref.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      SUPABASE_URL: "",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing required environment variable: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  });

  it("fails fast when the Supabase service role key is missing", () => {
    const result = runMigrationWithEnv({
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      SUPABASE_URL: "https://example.supabase.co",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
  });

  it("treats copied service role placeholders as missing configuration", () => {
    const result = runMigrationWithEnv({
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "your_service_role_key",
      SUPABASE_URL: "https://example.supabase.co",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
  });
});
