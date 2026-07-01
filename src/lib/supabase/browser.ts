import { createBrowserClient } from "@supabase/ssr";

const missingSupabaseBrowserEnvMessage =
  "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.";

const supabaseUrlPlaceholderValues = new Set(["https://your-project-ref.supabase.co"]);
const supabasePublishableKeyPlaceholderValues = new Set([
  "sb_publishable_your_project_key",
  "legacy_anon_key_if_needed",
]);

function readBrowserEnv(value: string | undefined) {
  return value?.trim() || "";
}

function readConfiguredBrowserEnv(value: string | undefined, placeholderValues: Set<string>) {
  const text = readBrowserEnv(value);
  return text && !placeholderValues.has(text.toLowerCase()) ? text : "";
}

function getSupabaseBrowserUrl() {
  return readConfiguredBrowserEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseUrlPlaceholderValues);
}

function getSupabaseBrowserPublishableKey() {
  return (
    readConfiguredBrowserEnv(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      supabasePublishableKeyPlaceholderValues,
    ) ||
    readConfiguredBrowserEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, supabasePublishableKeyPlaceholderValues)
  );
}

export function isSupabaseBrowserConfigured() {
  return Boolean(getSupabaseBrowserUrl() && getSupabaseBrowserPublishableKey());
}

export function getSupabaseBrowserClient() {
  const supabaseUrl = getSupabaseBrowserUrl();
  const supabasePublishableKey = getSupabaseBrowserPublishableKey();

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(missingSupabaseBrowserEnvMessage);
  }
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
