import { createClient } from "@supabase/supabase-js";

// Values are injected at build time from Vite env. The anon key is
// publishable by design — real security comes from RLS + Edge Functions.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Use implicit flow so login works from ephemeral preview panels.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          flowType: "implicit",
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export const isSupabaseConfigured = () => Boolean(supabase);