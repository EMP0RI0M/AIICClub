import { getSupabaseAdmin } from "@/shared/supabase/admin";

/**
 * Broadcast a real-time event to a Supabase Realtime channel (e.g. user:id or dm:id).
 */
export async function broadcastRealtimeEvent(
    channelName: string,
    event: string,
    payload: Record<string, any>
) {
    try {
        const supabase = getSupabaseAdmin();
        const channel = supabase.channel(channelName, {
            config: { broadcast: { ack: true } },
        });

        await new Promise<void>((resolve) => {
            let finished = false;
            const finish = () => {
                if (finished) return;
                finished = true;
                try {
                    supabase.removeChannel(channel);
                } catch {}
                resolve();
            };

            channel.subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    try {
                        await channel.send({
                            type: "broadcast",
                            event,
                            payload,
                        });
                    } catch (e) {
                        console.error(`[BROADCAST_ERROR] Failed during send to ${channelName}:`, e);
                    } finally {
                        finish();
                    }
                } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    finish();
                }
            });

            // Safety timeout after 3 seconds
            setTimeout(finish, 3000);
        });
    } catch (err) {
        console.error(`[BROADCAST_ERROR] Failed to send ${event} to ${channelName}:`, err);
    }
}
