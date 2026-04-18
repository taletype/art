"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "./config";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }

  return browserClient;
}
