import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NativeStorage } from "./storage";

/**
 * Mobile Supabase client configured with SecureStore/AsyncStorage auth persistence.
 */
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "") ||
  "https://tgbjgyhcfhqvwayvvwkl.supabase.co";

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYmpneWhjZmhxdndheXZ2d2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MTcwNjIsImV4cCI6MjEwMjI5MzA2Mn0.Cjj6oY9s7FwTywXlw-9h4Um01cBvfllKQqapobmYXNY";

let cachedClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: NativeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return cachedClient;
}

export async function authorizeRealtimeClient(): Promise<SupabaseClient> {
  const client = getSupabaseClient();
  const { data } = await client.auth.getSession();
  if (data.session?.access_token) {
    await client.realtime.setAuth(data.session.access_token);
  }
  return client;
}
