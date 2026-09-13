import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { parseMessageContent, encodeAttachmentContent } from "@/shared/lib/attachments";
import { generateAIICDocumentPDF } from "@/shared/lib/pdf-engine";
import { runPythonCode } from "@/shared/lib/python-runtime";

export const BOT_USER_ID = "00000000-0000-0000-0000-000000000001";
export const BOT_ROLE_ID = "00000000-0000-0000-0000-000000000002";

// Active Fast & Free Models on OpenRouter
export const NVIDIA_MODELS = {
    SAFETY: "nvidia/nemotron-3.5-content-safety:free",
    BRAIN: "nvidia/nemotron-3.5-lightning:free",
    FAST: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    FALLBACK: "nvidia/nemotron-3.5-lightning:free",
    MULTIMODAL: "nvidia/nemotron-3.5-lightning:free",
    EMBED: "nvidia/llama-nemotron-embed-vl-1b-v2:free",
} as const;

export interface ModerationResult {
    safe: boolean;
    category:
        | "harassment"
        | "hate_speech"
        | "sexual"
        | "violence_threat"
        | "spam"
        | "prompt_injection"
        | "prohibited_language"
        | "none";
    severity: 0 | 1 | 2 | 3; // 0=Safe, 1=Minor, 2=Serious, 3=Critical
    confidence: number;
    recommendedAction: "allow" | "warn" | "purge" | "escalate";
    explanation: string;
    language: string;
    script: string;
    isCodeSwitched: boolean;
    normalizedText: string;
    evasionDetected: boolean;
    modelUsed: string;
}

export interface UserModProfile {
    userId: string;
    warningCount: number;
    violationCount: number;
    lastWarningAt: string | null;
    recentCategories: string[];
    trustLevel: "high" | "normal" | "restricted";
}

// In-memory rate limiting and idempotency caches
const processedModerationMessageIds = new Set<string>();
const userMessageTimestamps = new Map<string, number[]>();
const userLastMessageContent = new Map<string, { text: string; time: number }>();

/**
 * OpenRouter Model Gateway with Auto-Fallback, Reasoning Preservation & Timeout Protection
 */
export async function callNvidiaModel(
    model: string = NVIDIA_MODELS.BRAIN,
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; max_tokens?: number }
): Promise<string | null> {
    const apiKey = process.env.OPENROUTER_API_KEY || "";
    if (!apiKey) return null;

    const candidateModels = [model, NVIDIA_MODELS.FALLBACK, NVIDIA_MODELS.FAST, "openrouter/free"];

    for (const candidate of candidateModels) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 18000);

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                signal: controller.signal,
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://aiic-bbs.vercel.app",
                    "X-Title": "Corvus AI Sentinel",
                },
                body: JSON.stringify({
                    model: candidate,
                    messages,
                    temperature: options?.temperature ?? 0.2,
                    max_tokens: options?.max_tokens ?? 1024,
                }),
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`[OPENROUTER_GATEWAY_WARN] Candidate: ${candidate} Status: ${response.status}`);
                continue;
            }

            const data = await response.json();
            const choice = data.choices?.[0];
            let content = choice?.message?.content || choice?.text || "";
            const rawReasoning = choice?.message?.reasoning || choice?.reasoning || "";

            // If reasoning was returned separately or embedded, wrap it into standard <think> block
            if (rawReasoning && typeof rawReasoning === "string" && rawReasoning.trim().length > 0) {
                content = `<think>\n${rawReasoning.trim()}\n</think>\n\n${content.trim()}`;
            } else if (content.includes("Here's a thinking process:")) {
                content = content.replace(
                    /Here's a thinking process:([\s\S]*?)(?=\n\n(?:###|Hello|\*\*|\[|\d|The|This|[A-Z]))/i,
                    (_: string, thinkBody: string) => `<think>\n${thinkBody.trim()}\n</think>\n\n`
                );
            }

            if (content.trim().length > 0) {
                return content.trim();
            }
        } catch (err) {
            console.warn(`[OPENROUTER_GATEWAY_ERROR] Candidate ${candidate}:`, err);
        }
    }

    return null;
}

/**
 * OpenRouter NVIDIA Embeddings Gateway
 * Generates vector embeddings using nvidia/llama-nemotron-embed-vl-1b-v2:free
 */
export async function generateNvidiaEmbedding(
    input: string | string[],
    model: string = NVIDIA_MODELS.EMBED
): Promise<number[] | number[][] | null> {
    const apiKey = process.env.OPENROUTER_API_KEY || "";
    if (!apiKey) return null;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
            method: "POST",
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://aiic-bbs.vercel.app",
                "X-Title": "Corvus AI Sentinel Knowledge Engine",
            },
            body: JSON.stringify({
                model,
                input,
            }),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(`[NVIDIA_EMBED_WARN] Model: ${model} Status: ${response.status}`, await response.text());
            return null;
        }

        const data = await response.json();
        if (Array.isArray(input)) {
            return data.data?.map((d: any) => d.embedding) || null;
        }
        return data.data?.[0]?.embedding || null;
    } catch (err) {
        console.warn("[NVIDIA_EMBED_ERROR]", err);
        return null;
    }
}

/**
 * Ensures bot system entities exist in database.
 */
export async function ensureBotEntity() {
    const supabase = getSupabaseAdmin();
    try {
        await supabase.from("organization_roles").upsert(
            {
                id: BOT_ROLE_ID,
                key: "bot",
                name: "AI Bot Sentinel",
                description: "Automated autonomous governance & moderation system",
                hierarchy_level: 0,
                color: "#10b981",
                badge_icon: "Bot",
            },
            { onConflict: "id" }
        );

        await supabase.from("users").upsert(
            {
                id: BOT_USER_ID,
                email: "sentinel@corvus.internal",
                username: "aiic_sentinel",
                display_name: "AIIC Sentinel",
                avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=aiic-sentinel",
                bio: "Automated Security & Governance Sentinel for AIIC Club.",
                role: "bot",
                status: "online",
                onboarding_completed: true,
                email_verified: true,
            },
            { onConflict: "id" }
        );
    } catch (err) {
        console.error("[ENSURE_BOT_ENTITY_ERROR]", err);
    }
}

/**
 * Deterministic Anti-Spam & Mass Mention Checks
 */
export function checkAntiSpamAndMentions(options: {
    userId: string;
    content: string;
    userRole?: string | null;
}): { blocked: boolean; reason?: string } {
    const { userId, content, userRole } = options;
    const isElevated = ["president_admin", "admin", "president", "vice_president", "teacher", "staff", "owner"].includes(
        (userRole || "").toLowerCase()
    );

    if (isElevated) {
        return { blocked: false };
    }

    const now = Date.now();
    const timestamps = userMessageTimestamps.get(userId) || [];
    const recent = timestamps.filter((t) => now - t < 5000); // within 5 seconds

    if (recent.length >= 5) {
        return { blocked: true, reason: "You are sending messages too quickly. Please slow down." };
    }

    recent.push(now);
    userMessageTimestamps.set(userId, recent);

    // Duplicate content spam check within 3 seconds
    const lastMsg = userLastMessageContent.get(userId);
    if (lastMsg && lastMsg.text === content.trim() && now - lastMsg.time < 3000) {
        return { blocked: true, reason: "Duplicate message detected." };
    }
    userLastMessageContent.set(userId, { text: content.trim(), time: now });

    // Mass mentions check
    const mentions = (content.match(/@\w+/g) || []).length;
    if (mentions > 5) {
        return { blocked: true, reason: "Too many mentions in a single message." };
    }

    return { blocked: false };
}

/**
 * Background Bot Sentinel Processor (Async trigger on new messages)
 */
export async function processBotSentinel(options: {
    channelId?: string;
    conversationId?: string;
    dmGroupId?: string;
    messageId: string;
    content: string;
    authorId: string;
    authorName: string;
}): Promise<void> {
    try {
        const { channelId, conversationId, dmGroupId, messageId, content, authorId, authorName } = options;
        const targetConversationId = conversationId || dmGroupId;

        if (authorId === BOT_USER_ID) return;
        if (processedModerationMessageIds.has(messageId)) return;
        processedModerationMessageIds.add(messageId);

        // In DMs, only respond if the conversation is a dedicated Bot DM (with BOT_USER_ID) or if explicitly mentioned
        let isDedicatedBotConversation = false;
        if (targetConversationId) {
            const supabase = getSupabaseAdmin();
            const { data: botParticipant } = await supabase
                .from("dm_participants")
                .select("user_id")
                .eq("conversation_id", targetConversationId)
                .eq("user_id", BOT_USER_ID)
                .maybeSingle();
            if (botParticipant) {
                isDedicatedBotConversation = true;
            }
        }

        // Check if message asks a question or mentions the bot
        const isBotMention =
            /@(bot|aiic|sentinel|corvus)/i.test(content) ||
            content.startsWith("!aiic ") ||
            content.startsWith("/ask ") ||
            isDedicatedBotConversation;

        if (isBotMention) {
            const cleanQuery = content
                .replace(/@(bot|aiic|sentinel|corvus)/gi, "")
                .replace(/^(!aiic|\/ask)\s+/i, "")
                .trim();

            if (cleanQuery.length > 1) {
                // Ensure bot user entity exists in DB
                await ensureBotEntity();

                // Dynamic import to avoid circular dependency
                const { runRecursiveLanguageModel } = await import("@/shared/lib/knowledge/engine");
                const rlmResult = await runRecursiveLanguageModel(cleanQuery, { authorName });

                let botReply = (rlmResult.answer || "")
                    .replace(/<think>[\s\S]*?<\/think>/gi, "")
                    .replace(/^Here's a thinking process:[\s\S]*?(?=\n\n(?:###|Hello|Hi|\*\*|\[|\d|The|This|[A-Z]))/i, "")
                    .replace(/^Reasoning Trace[\s\S]*?(?=\n\n?Answer\b|\n\n?[A-Z])/i, "")
                    .replace(/^Answer\s*[:\n]+/i, "")
                    .replace(/^We need to respond as Corvus[\s\S]*?(?=\n\n?[A-Z]|Hello|Hi)/i, "")
                    .trim();

                if (!botReply) {
                    botReply = "I am ready to assist you with Python code execution, mathematical proofs (LaTeX), PDF document generation, full-stack software development, or AIIC curriculum questions. Please let me know what you'd like to work on!";
                }

                const supabase = getSupabaseAdmin();

                if (channelId) {
                    const { data: insertedMsg, error: insErr } = await supabase
                        .from("messages")
                        .insert({
                            channel_id: channelId,
                            author_id: BOT_USER_ID,
                            content: botReply,
                            reply_to_id: messageId,
                        })
                        .select(`
                            id,
                            channel_id,
                            author_id,
                            content,
                            type,
                            reply_to_id,
                            edited_at,
                            created_at,
                            author:users!author_id (
                                id,
                                username,
                                display_name,
                                avatar_url
                            )
                        `)
                        .single();

                    if (!insErr && insertedMsg) {
                        try {
                            const rtChan = supabase.channel(`channel:${channelId}`);
                            await rtChan.send({
                                type: "broadcast",
                                event: "new_message",
                                payload: {
                                    message: {
                                        id: insertedMsg.id,
                                        channelId: insertedMsg.channel_id,
                                        authorId: insertedMsg.author_id,
                                        content: insertedMsg.content,
                                        type: "default",
                                        replyTo: { id: messageId },
                                        pinned: false,
                                        createdAt: insertedMsg.created_at,
                                        updatedAt: insertedMsg.created_at,
                                        reactions: [],
                                        attachments: [],
                                        author: {
                                            id: BOT_USER_ID,
                                            username: "aiic_sentinel",
                                            displayName: "Corvus AI Sentinel",
                                            avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=aiic-sentinel",
                                        },
                                    },
                                },
                            });
                        } catch (rtErr) {
                            console.warn("[BOT_REALTIME_CHANNEL_WARN]", rtErr);
                        }
                    }
                } else if (targetConversationId) {
                    const { data: insertedDm, error: dmErr } = await supabase
                        .from("dm_messages")
                        .insert({
                            conversation_id: targetConversationId,
                            author_id: BOT_USER_ID,
                            content: botReply,
                            reply_to_id: messageId,
                        })
                        .select(`
                            id,
                            conversation_id,
                            author_id,
                            content,
                            type,
                            reply_to_id,
                            edited_at,
                            created_at,
                            author:users!dm_messages_author_id_fkey (
                                id,
                                username,
                                display_name,
                                avatar_url
                            )
                        `)
                        .single();

                    if (!dmErr && insertedDm) {
                        try {
                            const rtDm = supabase.channel(`dm:${targetConversationId}`);
                            await rtDm.send({
                                type: "broadcast",
                                event: "new_dm_message",
                                payload: {
                                    message: {
                                        id: insertedDm.id,
                                        conversationId: targetConversationId,
                                        content: insertedDm.content,
                                        type: "default",
                                        replyTo: { id: messageId },
                                        createdAt: insertedDm.created_at,
                                        editedAt: insertedDm.created_at,
                                        author: {
                                            id: BOT_USER_ID,
                                            username: "aiic_sentinel",
                                            displayName: "Corvus AI Sentinel",
                                            avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=aiic-sentinel",
                                        },
                                    },
                                    conversationId: targetConversationId,
                                },
                            });
                        } catch (rtErr) {
                            console.warn("[BOT_REALTIME_DM_WARN]", rtErr);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.warn("[PROCESS_BOT_SENTINEL_ERROR]", err);
    }
}
