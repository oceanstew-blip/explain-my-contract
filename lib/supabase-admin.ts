import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdmin(url: string, secretKey: string) {
  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
