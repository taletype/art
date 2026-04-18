const missingSupabaseEnvMessage =
  "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.";

function readString(value: string | undefined) {
  return value?.trim() || "";
}

export function getSupabaseUrl() {
  const value = readString(process.env.NEXT_PUBLIC_SUPABASE_URL) || readString(process.env.SUPABASE_URL);
  if (!value) {
    throw new Error(missingSupabaseEnvMessage);
  }
  return value;
}

export function getSupabasePublishableKey() {
  const value =
    readString(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    readString(process.env.SUPABASE_PUBLISHABLE_KEY) ||
    readString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    readString(process.env.SUPABASE_ANON_KEY);

  if (!value) {
    throw new Error(missingSupabaseEnvMessage);
  }
  return value;
}

export function getSupabaseServiceRoleKey() {
  const value = readString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!value) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin Supabase access.");
  }
  return value;
}

export function getDatabaseUrl() {
  const value =
    readString(process.env.DATABASE_URL) ||
    readString(process.env.POSTGRES_PRISMA_URL) ||
    readString(process.env.POSTGRES_URL);

  if (!value) {
    throw new Error("DATABASE_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL must be configured.");
  }

  return value;
}

export function isSupabaseConfigured() {
  return Boolean(
    (readString(process.env.NEXT_PUBLIC_SUPABASE_URL) || readString(process.env.SUPABASE_URL)) &&
      (
        readString(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
        readString(process.env.SUPABASE_PUBLISHABLE_KEY) ||
        readString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
        readString(process.env.SUPABASE_ANON_KEY)
      ),
  );
}
