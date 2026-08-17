const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

let env = {};
const envPath = "/root/Corvus/apps/web/.env.local";
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx > -1) {
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      env[k] = v;
    }
  });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL:", supabaseUrl);
const supabase = createClient(supabaseUrl, serviceKey);

async function inspect() {
  const { data: reactions, error: rErr } = await supabase.from("reactions").select("*").limit(5);
  console.log("Existing Reactions:", reactions, "Error:", rErr);

  const { data: users, error: uErr } = await supabase.from("users").select("id, auth_user_id, username").limit(5);
  console.log("Sample Users:", users, "Error:", uErr);

  const { data: messages, error: mErr } = await supabase.from("messages").select("id, content, channel_id, author_id").limit(5);
  console.log("Sample Messages:", messages, "Error:", mErr);
}

inspect().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
