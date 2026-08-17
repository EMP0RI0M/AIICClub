import { getSupabaseClient } from "@/shared/supabase/client";

export interface UserAppearanceSettings {
    theme: string;
    accentColor: string;
    fontSize: string;
    compactMode: boolean;
    messageGrouping: boolean;
    animatedEmojis: boolean;
}

export interface UserVoiceSettings {
    inputDeviceId: string | null;
    outputDeviceId: string | null;
    inputVolume: number;
    outputVolume: number;
    inputMode: string;
    pushToTalkKey: string | null;
    noiseSuppression: boolean;
    echoCancellation: boolean;
    automaticGainControl: boolean;
}

export interface UserNotificationSettings {
    desktopNotifications: boolean;
    soundEnabled: boolean;
    notificationSound: string;
    emailNotifications: boolean;
    notifyOnAllMessages: boolean;
    notifyOnMentions: boolean;
    notificationVolume?: number;
    mentionTone?: string;
}

export interface UserPrivacySettings {
    sendReadReceipts: boolean;
    showTypingIndicator: boolean;
    sharePresence: boolean;
    allowDMs: boolean;
}

export interface UserDeviceSettings {
    microphone: string | null;
    speakers: string | null;
    camera: string | null;
}

export interface AutomationRule {
    id: string;
    trigger: string;
    condition?: string;
    action: string;
    enabled?: boolean;
}

export interface WebhookConfig {
    id?: string;
    inboundToken?: string;
    outboundUrl?: string;
    method?: string;
    payloadTemplate?: string;
}

export async function getCurrentUserId(): Promise<string | null> {
    try {
        const supabase = getSupabaseClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return null;
        return user.id;
    } catch {
        return null;
    }
}

/* ── Generic User Settings Blob in public.user_settings ───────── */

export async function fetchGenericUserSettings(): Promise<Record<string, any>> {
    const userId = await getCurrentUserId();
    if (!userId) return {};

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("user_settings")
        .select("settings")
        .eq("user_id", userId)
        .maybeSingle();

    if (error || !data) return {};
    return data.settings || {};
}

export async function saveGenericUserSettings(key: string, value: any): Promise<boolean> {
    try {
        if (typeof window !== "undefined") {
            try {
                localStorage.setItem(`aiic_pref_${key}`, JSON.stringify(value));
            } catch {
                // ignore storage quota errors
            }
        }

        const userId = await getCurrentUserId();
        if (!userId) return true; // Handled locally for guest/unauthenticated preview

        const supabase = getSupabaseClient();
        const current = await fetchGenericUserSettings();
        const updated = { ...current, [key]: value };

        const { error } = await supabase
            .from("user_settings")
            .upsert({
                user_id: userId,
                settings: updated,
                updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });

        if (error) {
            // Silently handled or logged as debug
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

/* ── Appearance Settings ─────────────────────────────────────── */

export async function fetchUserAppearance(): Promise<UserAppearanceSettings | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const supabase = getSupabaseClient();
    const { data } = await supabase
        .from("user_appearance_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (!data) return null;

    return {
        theme: data.theme ?? "dark",
        accentColor: data.accent_color ?? "#5865F2",
        fontSize: data.font_size ?? "medium",
        compactMode: Boolean(data.compact_mode),
        messageGrouping: data.message_grouping !== false,
        animatedEmojis: data.animated_emojis !== false,
    };
}

export async function saveUserAppearance(settings: Partial<UserAppearanceSettings>): Promise<boolean> {
    try {
        if (typeof window !== "undefined") {
            try {
                localStorage.setItem("aiic_pref_appearance", JSON.stringify(settings));
            } catch {
                // ignore
            }
        }

        const userId = await getCurrentUserId();
        if (!userId) return true;

        const supabase = getSupabaseClient();
        const dbPayload: Record<string, any> = {
            user_id: userId,
            updated_at: new Date().toISOString(),
        };

        if (settings.theme !== undefined) dbPayload.theme = settings.theme;
        if (settings.accentColor !== undefined) dbPayload.accent_color = settings.accentColor;
        if (settings.fontSize !== undefined) dbPayload.font_size = settings.fontSize;
        if (settings.compactMode !== undefined) dbPayload.compact_mode = settings.compactMode;
        if (settings.messageGrouping !== undefined) dbPayload.message_grouping = settings.messageGrouping;
        if (settings.animatedEmojis !== undefined) dbPayload.animated_emojis = settings.animatedEmojis;

        try {
            await supabase
                .from("user_appearance_settings")
                .upsert(dbPayload, { onConflict: "user_id" });
        } catch {
            // fallback
        }

        // Also persist in generic blob for cross-device consistency
        await saveGenericUserSettings("appearance", settings);
        return true;
    } catch {
        return false;
    }
}

/* ── Voice & Audio Settings ──────────────────────────────────── */

export async function fetchUserVoice(): Promise<UserVoiceSettings | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const supabase = getSupabaseClient();
    const { data } = await supabase
        .from("user_voice_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (!data) return null;

    return {
        inputDeviceId: data.input_device_id ?? null,
        outputDeviceId: data.output_device_id ?? null,
        inputVolume: data.input_volume ?? 100,
        outputVolume: data.output_volume ?? 100,
        inputMode: data.input_mode ?? "voice_activity",
        pushToTalkKey: data.push_to_talk_key ?? null,
        noiseSuppression: data.noise_suppression !== false,
        echoCancellation: data.echo_cancellation !== false,
        automaticGainControl: data.automatic_gain_control !== false,
    };
}

export async function saveUserVoice(settings: Partial<UserVoiceSettings>): Promise<boolean> {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const supabase = getSupabaseClient();
    const dbPayload: Record<string, any> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
    };

    if (settings.inputDeviceId !== undefined) dbPayload.input_device_id = settings.inputDeviceId;
    if (settings.outputDeviceId !== undefined) dbPayload.output_device_id = settings.outputDeviceId;
    if (settings.inputVolume !== undefined) dbPayload.input_volume = settings.inputVolume;
    if (settings.outputVolume !== undefined) dbPayload.output_volume = settings.outputVolume;
    if (settings.inputMode !== undefined) dbPayload.input_mode = settings.inputMode;
    if (settings.pushToTalkKey !== undefined) dbPayload.push_to_talk_key = settings.pushToTalkKey;
    if (settings.noiseSuppression !== undefined) dbPayload.noise_suppression = settings.noiseSuppression;
    if (settings.echoCancellation !== undefined) dbPayload.echo_cancellation = settings.echoCancellation;
    if (settings.automaticGainControl !== undefined) dbPayload.automatic_gain_control = settings.automaticGainControl;

    await supabase
        .from("user_voice_settings")
        .upsert(dbPayload, { onConflict: "user_id" });

    await saveGenericUserSettings("voice", settings);
    return true;
}

/* ── Notification Settings ───────────────────────────────────── */

export async function fetchUserNotificationSettings(): Promise<UserNotificationSettings | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const supabase = getSupabaseClient();
    const { data } = await supabase
        .from("user_notification_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (!data) return null;

    return {
        desktopNotifications: data.desktop_notifications !== false,
        soundEnabled: data.sound_enabled !== false,
        notificationSound: data.notification_sound ?? "default",
        emailNotifications: Boolean(data.email_notifications),
        notifyOnAllMessages: Boolean(data.notify_on_all_messages),
        notifyOnMentions: data.notify_on_mentions !== false,
    };
}

export async function saveUserNotificationSettings(settings: Partial<UserNotificationSettings>): Promise<boolean> {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const supabase = getSupabaseClient();
    const dbPayload: Record<string, any> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
    };

    if (settings.desktopNotifications !== undefined) dbPayload.desktop_notifications = settings.desktopNotifications;
    if (settings.soundEnabled !== undefined) dbPayload.sound_enabled = settings.soundEnabled;
    if (settings.notificationSound !== undefined) dbPayload.notification_sound = settings.notificationSound;
    if (settings.emailNotifications !== undefined) dbPayload.email_notifications = settings.emailNotifications;
    if (settings.notifyOnAllMessages !== undefined) dbPayload.notify_on_all_messages = settings.notifyOnAllMessages;
    if (settings.notifyOnMentions !== undefined) dbPayload.notify_on_mentions = settings.notifyOnMentions;

    await supabase
        .from("user_notification_settings")
        .upsert(dbPayload, { onConflict: "user_id" });

    await saveGenericUserSettings("notifications", settings);
    return true;
}

/* ── Privacy Settings ────────────────────────────────────────── */

export async function fetchUserPrivacySettings(): Promise<UserPrivacySettings> {
    const generic = await fetchGenericUserSettings();
    const privacy = generic.privacy || {};
    return {
        sendReadReceipts: privacy.sendReadReceipts !== false,
        showTypingIndicator: privacy.showTypingIndicator !== false,
        sharePresence: privacy.sharePresence !== false,
        allowDMs: privacy.allowDMs !== false,
    };
}

export async function saveUserPrivacySettings(settings: Partial<UserPrivacySettings>): Promise<boolean> {
    const current = await fetchUserPrivacySettings();
    const updated = { ...current, ...settings };
    return saveGenericUserSettings("privacy", updated);
}

/* ── Device Settings ─────────────────────────────────────────── */

export async function fetchUserDeviceSettings(): Promise<UserDeviceSettings> {
    const generic = await fetchGenericUserSettings();
    const devices = generic.devices || {};
    return {
        microphone: devices.microphone || "default",
        speakers: devices.speakers || "default",
        camera: devices.camera || "default",
    };
}

export async function saveUserDeviceSettings(settings: Partial<UserDeviceSettings>): Promise<boolean> {
    const current = await fetchUserDeviceSettings();
    const updated = { ...current, ...settings };
    return saveGenericUserSettings("devices", updated);
}

/* ── Keybindings ─────────────────────────────────────────────── */

export async function fetchUserKeybindings(): Promise<Record<string, string>> {
    const generic = await fetchGenericUserSettings();
    return generic.keybindings || {
        search: "Ctrl+F",
        recordClip: "Ctrl+Shift+R",
        sendMessage: "Enter",
        newLine: "Shift+Enter",
    };
}

export async function saveUserKeybindings(keybindings: Record<string, string>): Promise<boolean> {
    return saveGenericUserSettings("keybindings", keybindings);
}

/* ── Space Automations & Webhooks ────────────────────────────── */

export async function fetchSpaceAutomations(spaceId: string): Promise<AutomationRule[]> {
    const generic = await fetchGenericUserSettings();
    const allSpaceAutomations = generic.space_automations || {};
    return allSpaceAutomations[spaceId] || [
        { id: "r1", trigger: "PR merged", action: "Move card to column", condition: "column = In progress", enabled: true },
        { id: "r2", trigger: "Card moved", action: "Send message to channel", condition: "to Done", enabled: true },
    ];
}

export async function saveSpaceAutomations(spaceId: string, rules: AutomationRule[]): Promise<boolean> {
    const generic = await fetchGenericUserSettings();
    const all = generic.space_automations || {};
    all[spaceId] = rules;
    return saveGenericUserSettings("space_automations", all);
}

export async function fetchSpaceWebhooks(spaceId: string): Promise<WebhookConfig> {
    const generic = await fetchGenericUserSettings();
    const all = generic.space_webhooks || {};
    return all[spaceId] || {
        inboundToken: `whk_${spaceId.slice(0, 8)}`,
        outboundUrl: "",
        method: "POST",
        payloadTemplate: `{\n  "event": "{{event}}",\n  "channel": "{{channel}}",\n  "actor": "{{actor}}",\n  "url": "{{url}}"\n}`,
    };
}

export async function saveSpaceWebhooks(spaceId: string, config: WebhookConfig): Promise<boolean> {
    const generic = await fetchGenericUserSettings();
    const all = generic.space_webhooks || {};
    all[spaceId] = config;
    return saveGenericUserSettings("space_webhooks", all);
}

/* ── Status & Presence ───────────────────────────────────────── */

export async function saveUserPresence(presence: "online" | "idle" | "dnd" | "offline", customStatus?: string | null): Promise<boolean> {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const supabase = getSupabaseClient();
    const dbPayload: Record<string, any> = {
        user_id: userId,
        presence,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    if (customStatus !== undefined) dbPayload.custom_status = customStatus;

    await supabase
        .from("user_status_presence")
        .upsert(dbPayload, { onConflict: "user_id" });

    // Also update public.users status column directly
    await supabase.from("users").update({
        status: presence,
        bio: customStatus ?? undefined,
        updated_at: new Date().toISOString(),
    }).eq("id", userId);

    return true;
}
