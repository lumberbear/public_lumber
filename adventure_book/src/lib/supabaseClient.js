import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://dyxqnvokqpwxgtqothcr.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_PZg_kpXc1g88DtTP6IJ6ew_WeYpbNpu";

export const STORAGE_BUCKET = "adventure-book-photos";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});

export function authRedirectUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  return url.toString();
}
