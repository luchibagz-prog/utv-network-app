import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required.");
}

if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required.");
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const defaultStorageKey = `sb-${projectRef}-auth-token`;

if (typeof window !== "undefined") {
  try {
    const pack14Session = window.localStorage.getItem("utv-auth-session");
    const existingSession = window.localStorage.getItem(defaultStorageKey);

    if (!existingSession && pack14Session) {
      window.localStorage.setItem(defaultStorageKey, pack14Session);
    }
  } catch {
    // Browser storage may be unavailable in private mode.
  }
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storageKey: defaultStorageKey,
    },
  }
);
