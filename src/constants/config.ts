/**
 * BlackBox COO — Frontend Configuration
 *
 * All non-secret, publishable values live here.
 * Secrets (API keys for other services) go into Supabase Edge Function secrets.
 */

export const SUPABASE_URL = "https://jrixnlgajavwemcwphjr.supabase.co";

/**
 * Publishable anon key — safe for client-side use.
 * Row Level Security is the real enforcement layer.
 */
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyaXhubGdhamF2d2VtY3dwaGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MjAxOTksImV4cCI6MjEwMTQ5NjE5OX0.RYuAGS1nUZ6Me-bhFhxWxeffXwDM1B7Y5jUlurVmTr8";