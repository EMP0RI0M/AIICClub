import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://tgbjgyhcfhqvwayvvwkl.supabase.co"
).trim().replace(/\/+$/, "");

const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYmpneWhjZmhxdndheXZ2d2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MTcwNjIsImV4cCI6MjEwMjI5MzA2Mn0.Cjj6oY9s7FwTywXlw-9h4Um01cBvfllKQqapobmYXNY"
).trim();

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (!adminClient) {
        adminClient = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });
    }
    return adminClient;
}
