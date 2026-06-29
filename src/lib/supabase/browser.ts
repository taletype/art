import { createBrowserClient } from "@supabase/ssr";

const missingSupabaseBrowserEnvMessage =
  "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.";

function readBrowserEnv(value: string | undefined) {
  return value?.trim() || "";
}

function getSupabaseBrowserUrl() {
  return readBrowserEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function getSupabaseBrowserPublishableKey() {
  return (
    readBrowserEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    readBrowserEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function getSupabaseBrowserClient() {
  const supabaseUrl = getSupabaseBrowserUrl();
  const supabasePublishableKey = getSupabaseBrowserPublishableKey();

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(missingSupabaseBrowserEnvMessage);
  }
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
