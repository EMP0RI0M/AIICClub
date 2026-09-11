import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://tgbjgyhcfhqvwayvvwkl.supabase.co"
).trim().replace(/\/+$/, "");

const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYmpneWhjZmhxdndheXZ2d2tsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjcxNzA2MiwiZXhwIjoyMTAyMjkzMDYyfQ.4iHHjkM9BRrw_8wBJ3CTMOWpy_4vP9IponteKv-AcRg"
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
