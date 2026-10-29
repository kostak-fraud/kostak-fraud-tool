import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/config/public-env";

let browserClient: SupabaseClient | undefined;

export function createBrowserSupabaseClient(): SupabaseClient {
  if (!browserClient) {
    const config = getSupabasePublicConfig();
    browserClient = createBrowserClient(config.url, config.publishableKey);
  }

  return browserClient;
}
