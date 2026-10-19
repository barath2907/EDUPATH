import { createClient } from "@supabase/supabase-js";

const env = (typeof import.meta !== "undefined" && (import.meta as any).env) || (typeof process !== "undefined" ? process.env : {}) || {};
const supabaseUrl = env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-key",
  { auth: { persistSession: true, autoRefreshToken: true } }
);
