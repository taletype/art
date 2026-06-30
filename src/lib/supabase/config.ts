const missingSupabaseEnvMessage =
  "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.";

const supabaseUrlPlaceholderValues = new Set(["https://your-project-ref.supabase.co"]);
const supabasePublishableKeyPlaceholderValues = new Set([
  "sb_publishable_your_project_key",
  "legacy_anon_key_if_needed",
]);
const supabaseServiceRoleKeyPlaceholderValues = new Set(["your_service_role_key"]);
const databaseUrlPlaceholderValues = new Set([
  "postgres://postgres:password@host:6543/postgres?sslmode=require",
  "postgres://postgres:password@host:6543/postgres?sslmode=require&pgbouncer=true",
]);

function readString(value: string | undefined) {
  return value?.trim() || "";
}

function readConfiguredString(value: string | undefined, placeholderValues: Set<string>) {
  const text = readString(value);
  return text && !placeholderValues.has(text.toLowerCase()) ? text : "";
}

function readFirstConfiguredString(values: Array<string | undefined>, placeholderValues: Set<string>) {
  for (const value of values) {
    const text = readConfiguredString(value, placeholderValues);
    if (text) {
      return text;
    }
  }

  return "";
}

function readConfiguredSupabaseUrl() {
  return readFirstConfiguredString(
    [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL],
    supabaseUrlPlaceholderValues,
  );
}

function readConfiguredSupabasePublishableKey() {
  return readFirstConfiguredString(
    [
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      process.env.SUPABASE_PUBLISHABLE_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.SUPABASE_ANON_KEY,
    ],
    supabasePublishableKeyPlaceholderValues,
  );
}

export function getSupabaseUrl() {
  const value = readConfiguredSupabaseUrl();
  if (!value) {
    throw new Error(missingSupabaseEnvMessage);
  }
  return value;
}

export function getSupabasePublishableKey() {
  const value = readConfiguredSupabasePublishableKey();

  if (!value) {
    throw new Error(missingSupabaseEnvMessage);
  }
  return value;
}

export function getSupabaseServiceRoleKey() {
  const value = readConfiguredString(process.env.SUPABASE_SERVICE_ROLE_KEY, supabaseServiceRoleKeyPlaceholderValues);
  if (!value) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin Supabase access.");
  }
  return value;
}

export function getDatabaseUrl() {
  const value = readFirstConfiguredString(
    [process.env.DATABASE_URL, process.env.POSTGRES_PRISMA_URL, process.env.POSTGRES_URL],
    databaseUrlPlaceholderValues,
  );

  if (!value) {
    throw new Error("DATABASE_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL must be configured.");
  }

  return value;
}

export function isSupabaseConfigured() {
  return Boolean(readConfiguredSupabaseUrl() && readConfiguredSupabasePublishableKey());
}
