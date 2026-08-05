import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../constants/config";

/**
 * Supabase client — created once at module load.
 * The anon key is publishable by design; real security comes from RLS.
 * Uses implicit flow so login works from ephemeral preview panels.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: "implicit",
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isSupabaseConfigured = () => Boolean(supabase);
