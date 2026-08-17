"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@corvus/ui";
import { NavRail } from "./NavRail";
import { SpacePanel } from "./SpacePanel";
import { DMPanel } from "./DMPanel";
import { MessageArea } from "./MessageArea";
import { MemberPanel } from "./MemberPanel";
import { ThreadPanel } from "./ThreadPanel";
import { VoiceView } from "./VoiceView";
import { SettingsView } from "./SettingsView";
import { BoardView } from "./BoardView";
import { DocsView } from "./DocsView";
import { GitHubView } from "./GitHubView";
import { CanvasView } from "./CanvasView";
import { IncidentView } from "./IncidentView";
import { SearchPanel, type SearchCorpus } from "./SearchPanel";
import { ClipRecorder } from "./ClipRecorder";
import { HomeView } from "./HomeView";
import { StageView } from "./StageView";
import { PinnedPanel } from "./PinnedPanel";
import { CallSession, IncomingCallCard, type ActiveCall, type CallPeer } from "./CallUI";
import {
    AddChannelDialog,
    AddSectionDialog,
    CreateSpaceDialog,
    NewGroupDialog,
    type SpaceTemplate,
} from "./CreateDialogs";
import { ToastViewport } from "@/shared/components/ui/Toast";


import type { ChannelType } from "@/shared/components/ui";
import { useToastStore } from "@/shared/stores/toast-store";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { useAppStore } from "@/features/workspace/store/app-store";
import { useChatStore } from "@/features/workspace/store/chat-store";
import {
    createChannel as createChannelApi,
    createServer,
    deleteChannel as deleteChannelApi,
    deleteServer as deleteServerApi,
    fetchWorkspaceModules,
    pinChannelMessage,
    saveBoardState,
    saveDocsState,
    saveGitHubState,
    saveIncidentState,
    sendDMMessage,
    sendMessage as sendChannelMessageApi,
    unpinChannelMessage,
    updateServer as updateServerApi,
    addReaction as addChannelReactionApi,
    removeReaction as removeChannelReactionApi,
    createDMConversation as createDMConversationApi,
    sendFriendRequest as sendFriendRequestApi,
    acceptFriendRequest as acceptFriendRequestApi,
    declineFriendRequest as declineFriendRequestApi,
    cancelFriendRequest as cancelFriendRequestApi,
    removeFriend as removeFriendApi,
    fetchFriendDashboard,
    searchFriendUsers as searchFriendUsersApi,
    editMessage as editChannelMessageApi,
    deleteMessageApi,
    editDMMessage,
    deleteDMMessage,
    addDMReaction,
    removeDMReaction,
    pinDMMessage,
    unpinDMMessage,
    uploadAttachment,
    fetchMessages,
    fetchDMMessages,
    startDMCall,
    joinDMCall,
    leaveDMCall,
    declineDMCall,
    type MessageData,
} from "@/shared/lib/api";


import { encodeAttachmentContent, formatAttachmentSize, type SharedAttachment } from "@/shared/lib/attachments";
import { usePermissionStore, usePermissions } from "@/shared/lib/permissions";
import { notifyEvent, ringIncoming } from "@/shared/lib/notify";

import type {
    BoardData,
    ChannelSection,
    ChatMessage,
    DMSummary,
    DocContent,
    FriendEntry,
    IncidentMeta,
    MemberRef,
    Presence,
    PullRequest,
    SpaceSummary,
    VoiceParticipant,
} from "./types";

/* Seeds for locally-created module channels. */
function emptyBoard(id: string, name: string): BoardData {
    return {
        id,
        name,
        columns: [
            { id: `${id}-todo`, title: "Todo", cards: [] },
            { id: `${id}-doing`, title: "In progress", cards: [] },
            { id: `${id}-done`, title: "Done", cards: [] },
        ],
    };
}

function newIncident(): IncidentMeta {
    return {
        status: "active",
        severity: "P3",
        services: [],
        duration: "just opened",
        timeline: [
            {
                at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                text: "Incident channel created",
            },
        ],
    };
}

function fmtCallDuration(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function statusToPresence(status: string | undefined): Presence {
    switch (status) {
        case "online":
            return "online";
        case "idle":
            return "idle";
        case "dnd":
            return "dnd";
        default:
            return "offline";
    }
}


export interface AppShellData {
    me: MemberRef & { statusText?: string };
    spaces: SpaceSummary[];
    /** spaceId → sections of channels */
    sectionsBySpace: Record<string, ChannelSection[]>;
    /** channelId (or DM conversation id) → messages */
    messagesByChannel: Record<string, ChatMessage[]>;
    /** spaceId → members */
    membersBySpace: Record<string, MemberRef[]>;
    /** voice channelId → live participants */
    voiceByChannel?: Record<string, VoiceParticipant[]>;
    /** DM conversations for DM mode */
    dmConversations?: DMSummary[];
    /** board channelId → board */
    boardsByChannel?: Record<string, BoardData>;
    /** docs channelId → documents */
    docsByChannel?: Record<string, DocContent[]>;
    /** github channelId → pull requests */
    prsByChannel?: Record<string, PullRequest[]>;
    /** incident channelId → incident metadata */
    incidentsByChannel?: Record<string, IncidentMeta>;
    /** Friends list (home + DM surface). */
    friends?: FriendEntry[];
}

export interface AppShellControl {
    activeSpaceId?: string;
    activeChannelId?: string;
    /** Which surface the URL targets. When set, the URL is the source of truth. */
    view?: "home" | "dms" | "space";
    /** DM conversation targeted by the URL (view === "dms"). */
    activeDmId?: string;
    onSelectSpace?: (id: string) => void;
    /** `spaceId` is passed when the channel lives outside the active space. */
    onSelectChannel?: (id: string, spaceId?: string) => void;
    onOpenHome?: () => void;
    onOpenDMs?: (conversationId?: string) => void;
    /** Real hrefs for nav items — enables middle-click / copy-link / new-tab. */
    hrefs?: {
        home: string;
        dms: string;
        space: (spaceId: string) => string;
        channel: (channelId: string) => string;
        dm: (conversationId: string) => string;
    };
}

/**
 * The three-column workspace (brief §App Shell). Self-contained and prop-driven:
 * NavRail · SpacePanel · MainArea, plus the on-demand Member/Thread/Search
 * panels. The main area switches on channel type — message, voice, board,
 * docs, github, canvas, incident.
 */
export function AppShell({
    data,
    control,
    demo,
}: {
    data: AppShellData;
    control?: AppShellControl;
    /** Sample mode — plays a short scripted sequence of incoming events. */
    demo?: boolean;
}) {
    // Selection is controlled when `control` provides it (routed shell), else local.
    const [localSpaceId, setLocalSpaceId] = useState(data.spaces[0]?.id ?? "");
    const activeSpaceId = control?.activeSpaceId ?? localSpaceId;

    const sections = useMemo(
        () => data.sectionsBySpace[activeSpaceId] ?? [],
        [data.sectionsBySpace, activeSpaceId],
    );
    const firstText = useMemo(
        () =>
            sections.flatMap((s) => s.channels).find((c) => c.type === "text") ??
            sections[0]?.channels[0],
        [sections],
    );

    const [localChannelId, setLocalChannelId] = useState(firstText?.id ?? "");
    const activeChannelId = control?.activeChannelId ?? localChannelId;

    // Home is the landing surface unless the URL already targets a channel.
    // When `control.view` is provided the URL drives these; locals are fallback.
    const [localHomeActive, setLocalHomeActive] = useState(!control?.activeChannelId);
    const [localDmsActive, setLocalDmsActive] = useState(false);
    const [localDmId, setLocalDmId] = useState(data.dmConversations?.[0]?.id ?? "");
    const homeActive = control?.view ? control.view === "home" : localHomeActive;
    const dmsActive = control?.view ? control.view === "dms" : localDmsActive;
    const activeDmId = control?.activeDmId ?? localDmId;
    const [showMembers, setShowMembers] = useState(false);
    const [threadParentId, setThreadParentId] = useState<string | null>(null);
    const [showPins, setShowPins] = useState(false);
    const [showSettings, setShowSettings] = useState<boolean | { mode: "user" | "space"; section?: string }>(false);
    const [showSearch, setShowSearch] = useState(false);
    const [recording, setRecording] = useState(false);
    const [call, setCall] = useState<ActiveCall | null>(null);
    const [callHost, setCallHost] = useState<HTMLDivElement | null>(null);
    const [incoming, setIncoming] = useState<{
        conversationId: string;
        caller: CallPeer;
        video?: boolean;
    } | null>(null);
    // Footer dock state — the self mute/deafen you carry into the next call.
    const [dockMuted, setDockMuted] = useState(false);
    const [dockDeafened, setDockDeafened] = useState(false);
    // Creation dialogs.
    const [showCreateSpace, setShowCreateSpace] = useState(false);
    const [showAddSection, setShowAddSection] = useState(false);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [addChannelTarget, setAddChannelTarget] = useState<{
        spaceId: string;
        sectionId: string;
        sectionName: string;
    } | null>(null);
    const workspace = useWorkspaceStore();
    const authUser = useAuthStore((s) => s.user);
    const appStore = useAppStore();
    const chatStore = useChatStore();
    const isLive = !!authUser;
    const { role: myRole, isTeamLeader } = usePermissions();
    const canCreateSpace = isTeamLeader || ["president_admin", "admin", "president", "vice_president"].includes(myRole);
    const demoPlayed = useRef(false);

    const hydrated = useRef(false);
    // Locally-echoed messages (sends, clips) layered over the prop-driven feed.
    const [localEcho, setLocalEcho] = useState<Record<string, ChatMessage[]>>({});
    // Reaction toggles layered over base messages: msgId → emoji → state.
    const [reactionOv, setReactionOv] = useState<
        Record<string, Record<string, { delta: number; reacted: boolean }>>
    >({});
    // Pin toggles, text edits, and deletions layered the same way.
    const [pinOv, setPinOv] = useState<Record<string, boolean>>({});
    const [editOv, setEditOv] = useState<Record<string, string>>({});
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

    const allChannels = useMemo(() => sections.flatMap((s) => s.channels), [sections]);
    const activeChannel = allChannels.find((c) => c.id === activeChannelId) ?? firstText;
    const space = data.spaces.find((s) => s.id === activeSpaceId);

    useEffect(() => {
        if (activeSpaceId && isLive) {
            void usePermissionStore.getState().fetchPermissions(activeSpaceId);
        }
    }, [activeSpaceId, isLive]);

    const refreshModules = async (spaceId: string) => {

        const modules = await fetchWorkspaceModules(spaceId);
        appStore.setWorkspaceModules(spaceId, modules);
    };

    const toApiChannelName = (name: string) =>
        name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 50) || "channel";

    // Ctrl/Cmd+F → search panel · Ctrl+Shift+R → clip recorder (brief §Search, §Clips)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "f") {
                e.preventDefault();
                setShowSearch(true);
            }
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "r") {
                e.preventDefault();
                setRecording(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Local chat layers survive reloads — hydrate once, then write through.
    useEffect(() => {
        try {
            const raw = localStorage.getItem("corvus-local-chat-v1");
            if (raw) {
                const saved = JSON.parse(raw) as {
                    echo?: Record<string, ChatMessage[]>;
                    reactions?: typeof reactionOv;
                    pins?: Record<string, boolean>;
                    edits?: Record<string, string>;
                    deleted?: string[];
                };
                if (saved.echo) setLocalEcho(saved.echo);
                if (saved.reactions) setReactionOv(saved.reactions);
                if (saved.pins) setPinOv(saved.pins);
                if (saved.edits) setEditOv(saved.edits);
                if (saved.deleted) setDeletedIds(new Set(saved.deleted));
            }
        } catch {
            /* corrupt cache — start clean */
        }
        hydrated.current = true;
    }, []);

    useEffect(() => {
        if (!hydrated.current) return;
        try {
            // blob: URLs die with the session — drop them so reloads degrade to
            // the named placeholder instead of a broken image.
            const echo = Object.fromEntries(
                Object.entries(localEcho).map(([k, msgs]) => [
                    k,
                    msgs.map((m) => ({
                        ...m,
                        attachments: m.attachments?.map((a) =>
                            a.url?.startsWith("blob:") ? { ...a, url: undefined } : a,
                        ),
                    })),
                ]),
            );
            localStorage.setItem(
                "corvus-local-chat-v1",
                JSON.stringify({
                    echo,
                    reactions: reactionOv,
                    pins: pinOv,
                    edits: editOv,
                    deleted: [...deletedIds],
                }),
            );
        } catch {
            /* storage full — keep going in memory */
        }
    }, [localEcho, reactionOv, pinOv, editOv, deletedIds]);

    // Incoming call → looping ringtone until accepted or declined.
    useEffect(() => {
        if (!incoming) return;
        const ring = ringIncoming();
        return () => ring.stop();
    }, [incoming]);

    // RoutedAppShell keeps the per-user Supabase topic alive and forwards call
    // signalling here so an incoming call is visible from every workspace view.
    useEffect(() => {
        const handleRealtime = (rawEvent: Event) => {
            const detail = (rawEvent as CustomEvent<{ event: string; payload: unknown }>).detail;
            if (!detail) return;
            const payload = detail.payload as Record<string, unknown>;

            if (detail.event === "incoming_call") {
                const conversationId = payload.conversationId as string | undefined;
                const callerId = payload.callerId as string | undefined;
                const callerName = payload.callerName as string | undefined;
                if (!conversationId || !callerId || !callerName || callerId === data.me.id) return;
                setIncoming({
                    conversationId,
                    video: Boolean(payload.video),
                    caller: {
                        id: callerId,
                        name: callerName,
                        avatar: (payload.callerAvatar as string | null | undefined) ?? undefined,
                    },
                });
                notifyEvent({
                    kind: "other",
                    title: `Incoming call from ${callerName}`,
                    body: payload.video ? "Video call" : "Voice call",
                    system: true,
                });
            }

            if (detail.event === "call_accepted") {
                const conversationId = payload.conversationId as string | undefined;
                if (call?.conversationId === conversationId) {
                    setCall((prev) => (prev ? { ...prev, status: "connected" } : null));
                }
            }

            if (detail.event === "call_declined") {
                const conversationId = payload.conversationId as string | undefined;
                if (call?.conversationId === conversationId) {
                    setCall(null);
                    useToastStore.getState().addToast({
                        title: "Call declined",
                        body: `${String(payload.declinedByName || "The recipient")} declined the call.`,
                        variant: "info",
                    });
                }
            }

            if (detail.event === "call_cancelled") {
                const conversationId = payload.conversationId as string | undefined;
                if (incoming?.conversationId === conversationId) setIncoming(null);
            }

            if (detail.event === "call_ended") {
                const conversationId = payload.conversationId as string | undefined;
                if (call?.conversationId === conversationId) setCall(null);
                if (incoming?.conversationId === conversationId) setIncoming(null);
            }

        };

        window.addEventListener("corvus:realtime", handleRealtime);
        return () => window.removeEventListener("corvus:realtime", handleRealtime);
    }, [call?.conversationId, incoming?.conversationId, data.me.id]);

    // Demo mode — a short scripted sequence so toasts, sounds, and the
    // incoming-call flow are visible without a realtime backend.
    useEffect(() => {
        if (!demo || demoPlayed.current) return;
        demoPlayed.current = true;
        const timers: ReturnType<typeof setTimeout>[] = [];

        timers.push(
            setTimeout(() => {
                const text = "ringtones are in — try calling me";
                setLocalEcho((m) => ({
                    ...m,
                    d1: [
                        ...(m.d1 ?? []),
                        {
                            id: `demo-msg-${Date.now()}`,
                            author: { id: "u2", name: "alex", presence: "online" },
                            at: new Date().toISOString(),
                            text,
                        },
                    ],
                }));
                notifyEvent({ kind: "message", title: "alex", body: text, system: true });
            }, 9_000),
        );

        timers.push(
            setTimeout(() => {
                notifyEvent({
                    kind: "mention",
                    title: "maya mentioned you in #general",
                    body: "@you can you sanity-check the new pin flow?",
                    system: true,
                });
            }, 22_000),
        );

        timers.push(
            setTimeout(() => {
                setIncoming({
                    conversationId: "d1",
                    caller: { id: "u1", name: "maya" },
                    video: false,
                });
                notifyEvent({
                    kind: "other",
                    title: "Incoming call",
                    body: "maya is calling you…",
                });
            }, 36_000),
        );

        return () => timers.forEach(clearTimeout);
    }, [demo]);

    const selectSpace = (id: string) => {
        const next = data.sectionsBySpace[id]
            ?.flatMap((s) => s.channels)
            .find((c) => c.type === "text");
        if (control?.onSelectSpace) {
            // One navigation, with the space made explicit so the channel push
            // doesn't resolve against the previous space.
            if (next && control.onSelectChannel) control.onSelectChannel(next.id, id);
            else control.onSelectSpace(id);
        } else {
            setLocalDmsActive(false);
            setLocalHomeActive(false);
            setLocalSpaceId(id);
            if (next) setLocalChannelId(next.id);
        }
    };

    const selectChannel = (id: string) => {
        setThreadParentId(null);
        setShowPins(false);
        if (control?.onSelectChannel) {
            control.onSelectChannel(id);
        } else {
            setLocalHomeActive(false);
            setLocalChannelId(id);
        }
    };

    // Open a channel that may live in another space (Home cards).
    const openChannelIn = (spaceId: string, channelId: string) => {
        setThreadParentId(null);
        setShowPins(false);
        if (control?.onSelectChannel) {
            control.onSelectChannel(channelId, spaceId);
        } else {
            setLocalDmsActive(false);
            setLocalHomeActive(false);
            setLocalSpaceId(spaceId);
            setLocalChannelId(channelId);
        }
    };

    const openHome = () => {
        if (control?.onOpenHome) {
            control.onOpenHome();
        } else {
            setLocalHomeActive(true);
            setLocalDmsActive(false);
        }
    };

    const openDMs = useCallback(
        (conversationId?: string) => {
            if (control?.onOpenDMs) {
                control.onOpenDMs(conversationId);
                return;
            }
            setLocalHomeActive(false);
            setLocalDmsActive(true);
            if (conversationId) setLocalDmId(conversationId);
        },
        [control],
    );

    // Merge base messages with every local layer: echoes, reactions, pins,
    // edits, deletions. One pipeline for channels, DMs, and group DMs.
    const messagesFor = (id: string): ChatMessage[] =>
        [
            ...new Map(
                [...(data.messagesByChannel[id] ?? []), ...(localEcho[id] ?? [])].map((message) => [
                    message.id,
                    message,
                ]),
            ).values(),
        ]
            .filter((m) => !deletedIds.has(m.id))
            .sort((a, b) => {
                const ta = new Date(a.at || 0).getTime();
                const tb = new Date(b.at || 0).getTime();
                if (ta !== tb) return ta - tb;
                return (a.id || "").localeCompare(b.id || "");
            })
            .map((m) => {
                let out = m;
                if (editOv[m.id] !== undefined) out = { ...out, text: editOv[m.id], edited: true };
                if (pinOv[m.id] !== undefined) out = { ...out, pinned: pinOv[m.id] };
                const ov = reactionOv[m.id];
                if (!ov) return out;
                const base = out.reactions ?? [];
                const merged = base
                    .map((r) => {
                        const o = ov[r.emoji];
                        if (!o) return r;
                        return { ...r, count: r.count + o.delta, reacted: o.reacted };
                    })
                    .filter((r) => r.count > 0);
                for (const [emoji, o] of Object.entries(ov)) {
                    if (!base.some((r) => r.emoji === emoji) && o.delta > 0) {
                        merged.push({ emoji, count: o.delta, reacted: o.reacted });
                    }
                }
                return { ...out, reactions: merged.length ? merged : undefined };
            });


    const togglePin = (targetId: string) => async (msgId: string) => {
        const msg = messagesFor(targetId).find((m) => m.id === msgId);
        const next = !(msg?.pinned ?? false);
        const isDmTarget = data.dmConversations?.some((c) => c.id === targetId);
        if (isLive) {
            const request = isDmTarget
                ? next
                    ? pinDMMessage(targetId, msgId)
                    : unpinDMMessage(targetId, msgId)
                : next
                  ? pinChannelMessage(targetId, msgId)
                  : unpinChannelMessage(targetId, msgId);
            try {
                await request;
                setPinOv((ov) => ({ ...ov, [msgId]: next }));
                useToastStore.getState().addToast({
                    title: next ? "Message pinned" : "Message unpinned",
                    body: msg?.text ? msg.text.slice(0, 80) : "Open the pin panel from the header.",
                    variant: "success",
                });
            } catch (err) {
                useToastStore.getState().addToast({
                    title: "Pin failed",
                    body:
                        err instanceof Error
                            ? err.message
                            : "Could not update the pin in Supabase.",
                    variant: "error",
                });
            }
            return;
        }
        setPinOv((ov) => ({ ...ov, [msgId]: next }));
        useToastStore.getState().addToast({
            title: next ? "Message pinned" : "Message unpinned",
            body: msg?.text ? msg.text.slice(0, 80) : "Open the pin panel from the header.",
            variant: "success",
        });
    };

    const editMessage = (targetId: string) => async (msgId: string, text: string) => {
        if (!isLive) {
            setEditOv((ov) => ({ ...ov, [msgId]: text }));
            return;
        }
        const isDmTarget = data.dmConversations?.some((c) => c.id === targetId);
        try {
            const response = isDmTarget
                ? await editDMMessage(targetId, msgId, text)
                : await editChannelMessageApi(msgId, text);
            chatStore.updateMessage(targetId, msgId, response.message as unknown as MessageData);
        } catch (err) {
            useToastStore.getState().addToast({
                title: "Edit failed",
                body: err instanceof Error ? err.message : "Could not edit this message.",
                variant: "error",
            });
        }
    };

    const deleteMessage = (targetId: string) => async (msgId: string) => {
        if (!isLive) {
            setDeletedIds((ids) => new Set(ids).add(msgId));
            return;
        }
        const isDmTarget = data.dmConversations?.some((c) => c.id === targetId);
        try {
            if (isDmTarget) await deleteDMMessage(targetId, msgId);
            else await deleteMessageApi(msgId);
            chatStore.deleteMessage(targetId, msgId);
        } catch (err) {
            useToastStore.getState().addToast({
                title: "Delete failed",
                body: err instanceof Error ? err.message : "Could not delete this message.",
                variant: "error",
            });
        }
    };

    const toggleReaction = (targetId: string) => (msgId: string, emoji: string) => {
        const msg = messagesFor(targetId).find((m) => m.id === msgId);
        const current = msg?.reactions?.find((r) => r.emoji === emoji);
        const reactedNow = current?.reacted ?? false;
        const isDmTarget = data.dmConversations?.some((c) => c.id === targetId);
        if (isLive && authUser) {
            const request = isDmTarget
                ? reactedNow
                    ? removeDMReaction(targetId, msgId, emoji)
                    : addDMReaction(targetId, msgId, emoji)
                : reactedNow
                  ? removeChannelReactionApi(msgId, emoji)
                  : addChannelReactionApi(msgId, emoji);
            request
                .then(() => {
                    if (reactedNow)
                        chatStore.removeReaction(targetId, msgId, emoji, authUser.id, authUser.id);
                    else chatStore.addReaction(targetId, msgId, emoji, authUser.id, authUser.id);
                })
                .catch((err) =>
                    useToastStore.getState().addToast({
                        title: "Reaction failed",
                        body:
                            err instanceof Error ? err.message : "Could not update this reaction.",
                        variant: "error",
                    }),
                );
            return;
        }
        setReactionOv((ov) => {
            const forMsg = { ...(ov[msgId] ?? {}) };
            const existing = forMsg[emoji] ?? { delta: 0, reacted: false };
            forMsg[emoji] = reactedNow
                ? { delta: existing.delta - 1, reacted: false }
                : { delta: existing.delta + 1, reacted: true };
            return { ...ov, [msgId]: forMsg };
        });
    };

    const sendMessage =
        (targetId: string) =>
        (
            text: string,
            attachments?: ChatMessage["attachments"],
            replyTo?: ChatMessage["replyTo"],
        ) => {
            const clientAt = new Date().toISOString();
            const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const isDmTarget = data.dmConversations?.some((c) => c.id === targetId);

            // Create immediate optimistic message with local preview
            const optimisticAttachments = (attachments ?? []).map((att) => ({
                kind: att.kind,
                name: att.name,
                size: att.size || (att.file ? formatAttachmentSize(att.file.size) : undefined),
                url: att.url || (att.file && typeof URL !== "undefined" ? URL.createObjectURL(att.file) : undefined),
            }));

            const optimisticMsg: ChatMessage = {
                id: tempId,
                author: data.me,
                at: clientAt,
                text,
                attachments: optimisticAttachments.length > 0 ? optimisticAttachments : undefined,
                replyTo,
            };

            // Display immediately in UI without any network delay
            setLocalEcho((m) => ({ ...m, [targetId]: [...(m[targetId] ?? []), optimisticMsg] }));

            if (isLive) {
                void (async () => {
                    try {
                        const contents: string[] = text ? [text] : [];
                        for (const attachment of attachments ?? []) {
                            let uploaded: SharedAttachment;
                            if (attachment.file) {
                                uploaded = (await uploadAttachment(attachment.file)).attachment;
                            } else if (attachment.url) {
                                uploaded = {
                                    url: attachment.url,
                                    name: attachment.name,
                                    size: 0,
                                    mimeType:
                                        attachment.kind === "gif"
                                            ? "image/gif"
                                            : "application/octet-stream",
                                    kind: attachment.kind === "video" ? "video" : "image",
                                };
                            } else {
                                continue;
                            }
                            contents.push(encodeAttachmentContent(uploaded));
                        }

                        for (const [index, content] of contents.entries()) {
                            const response = isDmTarget
                                ? await sendDMMessage(
                                      targetId,
                                      content,
                                      index === 0 ? replyTo?.id : undefined,
                                  )
                                : await sendChannelMessageApi(targetId, {
                                      content,
                                      replyToId: index === 0 ? replyTo?.id : undefined,
                                  });

                            // Reconcile: remove optimistic temp and insert confirmed server message
                            setLocalEcho((m) => ({
                                ...m,
                                [targetId]: (m[targetId] ?? []).filter((msg) => msg.id !== tempId),
                            }));
                            chatStore.addMessage(
                                targetId,
                                response.message as unknown as MessageData,
                            );
                        }
                    } catch (err) {
                        setLocalEcho((m) => ({
                            ...m,
                            [targetId]: (m[targetId] ?? []).filter((msg) => msg.id !== tempId),
                        }));
                        useToastStore.getState().addToast({
                            title: "Message failed",
                            body:
                                err instanceof Error
                                    ? err.message
                                    : "Could not save the message in Supabase.",
                            variant: "error",
                        });
                    }
                })();
            }
        };


    const channelMessages = activeChannel ? messagesFor(activeChannel.id) : [];
    const dmConversation = data.dmConversations?.find((c) => c.id === activeDmId);
    const dmMessages = activeDmId ? messagesFor(activeDmId) : [];
    const threadParent = (dmsActive ? dmMessages : channelMessages).find((m) => m.id === threadParentId) ?? null;

    const loadOlder = (targetId: string) => async () => {
        if (!isLive || chatStore.loadingChannels.has(targetId) || !chatStore.hasMore[targetId])
            return;
        chatStore.setLoading(targetId, true);
        const isDmTarget = data.dmConversations?.some((c) => c.id === targetId);
        try {
            const response = isDmTarget
                ? await fetchDMMessages(targetId, chatStore.cursors[targetId] ?? undefined)
                : await fetchMessages(targetId, chatStore.cursors[targetId] ?? undefined);
            chatStore.prependMessages(
                targetId,
                response.messages as unknown as MessageData[],
                response.nextCursor,
                response.hasMore,
            );
        } catch (err) {
            useToastStore.getState().addToast({
                title: "Older messages failed to load",
                body: err instanceof Error ? err.message : "Scroll up to try again.",
                variant: "error",
            });
        } finally {
            chatStore.setLoading(targetId, false);
        }
    };

    // Stop recording → a clip message lands in the current channel.
    const finishClip = async (duration: string, file?: File) => {
        setRecording(false);
        const targetId = dmsActive ? activeDmId : activeChannel?.id;
        if (!targetId) return;

        let clipUrl = "";
        let clipSize = "2 MB";

        if (file) {
            try {
                const res = await uploadAttachment(file);
                if (res.attachment?.url) {
                    clipUrl = res.attachment.url;
                    clipSize = formatAttachmentSize(file.size);
                }
            } catch (err) {
                console.warn("[CLIP] Upload notice:", err);
            }
        }

        const clipPayload = `clip:${encodeURIComponent(JSON.stringify({ duration, size: clipSize, url: clipUrl }))}`;

        if (isLive) {
            try {
                const isDmTarget = data.dmConversations?.some((c) => c.id === targetId);
                const response = isDmTarget
                    ? await sendDMMessage(targetId, clipPayload)
                    : await sendChannelMessageApi(targetId, { content: clipPayload });
                chatStore.addMessage(targetId, response.message as unknown as MessageData);
            } catch (err) {
                console.error("[CLIP] Send error:", err);
            }
        } else {
            const msg: ChatMessage = {
                id: `clip${Date.now()}`,
                author: data.me,
                at: new Date().toISOString(),
                text: "",
                clip: { duration, size: clipSize, url: clipUrl },
            };
            setLocalEcho((m) => ({ ...m, [targetId]: [...(m[targetId] ?? []), msg] }));
        }

        useToastStore.getState().addToast({
            title: "Clip posted",
            body: `${duration} clip shared in the current conversation.`,
            variant: "success",
        });
    };


    // Everything searchable in the active space (brief §Search).
    const searchCorpus: SearchCorpus = useMemo(() => {
        const messages = allChannels.flatMap((ch) =>
            (data.messagesByChannel[ch.id] ?? []).map((m) => ({ ...m, channel: ch.name })),
        );
        const cards = allChannels.flatMap((ch) => {
            const board = data.boardsByChannel?.[ch.id];
            return board
                ? board.columns.flatMap((col) =>
                      col.cards.map((c) => ({ ...c, column: col.title })),
                  )
                : [];
        });
        const docs = allChannels.flatMap((ch) =>
            (data.docsByChannel?.[ch.id] ?? []).map((d) => ({
                ...d,
                preview: d.blocks.find((b) => b.type === "p")?.text,
            })),
        );
        const prs = allChannels.flatMap((ch) => data.prsByChannel?.[ch.id] ?? []);
        return { messages, cards, docs, prs };
    }, [allChannels, data]);

    // Start an outgoing DM call — group DMs ring every member (the demo seam
    // for the realtime call stack).
    const startCallForConversation = useCallback(
        async (conversation: DMSummary, video?: boolean) => {
            const peers: CallPeer[] = conversation.group?.length
                ? conversation.group.map((g) => ({ id: g.id, name: g.name, avatar: g.avatar }))
                : [
                      {
                          id: conversation.peerId ?? conversation.id,
                          name: conversation.name,
                          avatar: conversation.avatar,
                      },
                  ];
            if (!isLive) {
                setCall({ conversationId: conversation.id, peers, video, name: conversation.name });
                return;
            }
            try {
                const transport = await startDMCall(conversation.id, Boolean(video));
                setCall({
                    conversationId: conversation.id,
                    peers,
                    video,
                    name: conversation.name,
                    isCaller: true,
                    status: "calling",
                    transport,
                });

            } catch (error) {
                useToastStore.getState().addToast({
                    title: "Call could not start",
                    body:
                        error instanceof Error
                            ? error.message
                            : "Check the LiveKit configuration and try again.",
                    variant: "error",
                });
            }
        },
        [isLive],
    );

    const startCall = (video?: boolean) => {
        if (!dmConversation) return;
        void startCallForConversation(dmConversation, video);
    };

    // Log a call entry into a conversation's feed (history for 1:1 and groups).
    const logCall = (
        conversationId: string,
        author: MemberRef,
        entry: NonNullable<ChatMessage["call"]>,
    ) => {
        const msg: ChatMessage = {
            id: `call${Date.now()}`,
            author,
            at: new Date().toISOString(),
            text: "",
            call: entry,
        };
        setLocalEcho((m) => ({ ...m, [conversationId]: [...(m[conversationId] ?? []), msg] }));
    };

    const endCall = (elapsedSeconds: number) => {
        if (call) {
            if (isLive) void leaveDMCall(call.conversationId).catch(() => undefined);
            logCall(call.conversationId, data.me, {
                kind: call.video ? "video" : "voice",
                duration: elapsedSeconds > 0 ? fmtCallDuration(elapsedSeconds) : undefined,
            });
        }
        setCall(null);
    };

    // Map an incoming caller to their DM conversation.
    const convoForCaller = (caller: CallPeer) =>
        data.dmConversations?.find(
            (c) =>
                c.id === caller.id ||
                (!c.group && c.name === caller.name) ||
                c.group?.some((g) => g.id === caller.id),
        );

    // Presence + custom status — applied across the app instantly; in live mode
    // the auth store pushes it to the backend so every user sees it.
    const setMyStatus = (presence: Presence, text?: string) => {
        workspace.setMyStatus({ presence, text });
        const auth = useAuthStore.getState();
        if (auth.user) auth.setStatus(presence === "offline" ? "invisible" : presence);
    };

    /* ── Friends — instant, optimistic request flow ── */
    const refreshFriends = () => {
        if (!isLive) return;
        fetchFriendDashboard()
            .then((r) => appStore.setFriends(r))
            .catch(() => {});
    };

    const pendingDirectDms = useRef(new Set<string>());

    const findDirectDmForFriend = useCallback(
        (friend: FriendEntry) =>
            data.dmConversations?.find(
                (conversation) =>
                    !conversation.group &&
                    (conversation.peerId === friend.id ||
                        conversation.id === friend.id ||
                        conversation.name.toLowerCase() === friend.name.toLowerCase()),
            ),
        [data.dmConversations],
    );

    const ensureDirectDm = useCallback(
        async (
            friend: FriendEntry,
            options: { open?: boolean; call?: boolean; quiet?: boolean } = {},
        ) => {
            const existing = findDirectDmForFriend(friend);
            if (existing) {
                if (options.open || options.call) openDMs(existing.id);
                if (options.call) void startCallForConversation(existing, false);
                return existing;
            }

            if (!isLive) {
                const convo: DMSummary = {
                    id: `dm${Date.now()}`,
                    peerId: friend.id,
                    name: friend.name,
                    avatar: friend.avatar,
                    presence: friend.presence,
                };
                workspace.createConversation(convo);
                if (options.open || options.call) openDMs(convo.id);
                if (options.call) void startCallForConversation(convo, false);
                return convo;
            }

            if (pendingDirectDms.current.has(friend.id)) return null;
            pendingDirectDms.current.add(friend.id);

            try {
                const result = await createDMConversationApi({ participantIds: [friend.id] });
                appStore.upsertDMConversation(result.conversation);
                const convo: DMSummary = {
                    id: result.conversation.id,
                    peerId: friend.id,
                    name: friend.name,
                    avatar: friend.avatar,
                    presence: friend.presence,
                };
                if (options.open || options.call) openDMs(result.conversation.id);
                if (options.call) void startCallForConversation(convo, false);
                return convo;
            } catch (err) {
                if (!options.quiet) {
                    useToastStore.getState().addToast({
                        title: "Direct message failed",
                        body:
                            err instanceof Error
                                ? err.message
                                : "Could not create the direct message.",
                        variant: "error",
                    });
                }
                return null;
            } finally {
                pendingDirectDms.current.delete(friend.id);
            }
        },
        [appStore, findDirectDmForFriend, isLive, openDMs, startCallForConversation, workspace],
    );

    useEffect(() => {
        if (!isLive) return;
        for (const friend of data.friends ?? []) {
            if (
                friend.pending ||
                findDirectDmForFriend(friend) ||
                pendingDirectDms.current.has(friend.id)
            ) {
                continue;
            }
            void ensureDirectDm(friend, { quiet: true });
        }
    }, [data.friends, ensureDirectDm, findDirectDmForFriend, isLive]);

    const searchFriendUsers = useCallback(
        (query: string) => {
            if (!isLive) return Promise.resolve([]);
            return searchFriendUsersApi(query).then((r) => r.users);
        },
        [isLive],
    );

    const openFriendDm = (friendId: string) => {
        const friend = data.friends?.find((f) => !f.pending && f.id === friendId);
        if (!friend) return;
        void ensureDirectDm(friend, { open: true });
    };

    const callFriend = (friendId: string) => {
        const friend = data.friends?.find((f) => !f.pending && f.id === friendId);
        if (!friend) return;
        void ensureDirectDm(friend, { open: true, call: true });
    };

    const sendFriendRequest = (target: string) => {
        const normalizedTarget = target.toLowerCase();
        const existing = data.friends?.find(
            (f) => f.id === target || f.name.toLowerCase() === normalizedTarget,
        );
        if (existing) {
            useToastStore.getState().addToast({
                title: existing.pending ? "Request already pending" : "Already friends",
                body: `@${existing.name} is already in your list.`,
                variant: "info",
            });
            return;
        }

        if (isLive) {
            sendFriendRequestApi(target)
                .then((result) => {
                    const name = result.user.username || result.user.displayName || target;
                    useToastStore.getState().addToast({
                        title: result.status === "accepted" ? "Friend added" : "Request sent",
                        body:
                            result.status === "accepted"
                                ? `You and @${name} are now friends.`
                                : `@${name} will see it under Pending.`,
                        variant: "success",
                    });
                    if (result.status === "accepted") {
                        void ensureDirectDm(
                            {
                                id: result.user.id,
                                name: result.user.displayName || result.user.username,
                                avatar: result.user.avatarUrl,
                                presence: statusToPresence(result.user.status),
                            },
                            { quiet: true },
                        );
                    }
                    refreshFriends();
                })
                .catch((err) => {
                    useToastStore.getState().addToast({
                        title: "Failed to send request",
                        body: err instanceof Error ? err.message : "Could not send friend request.",
                        variant: "error",
                    });
                });
            return;
        }

        const id = `fr${Date.now()}`;
        workspace.sendFriendRequest({ id, name: target, presence: "offline", pending: "outgoing" });
        useToastStore.getState().addToast({
            title: "Request sent",
            body: `@${target} will see it instantly under Pending.`,
            variant: "success",
        });
        // Demo seam — the realtime backend would push the acceptance.
        if (demo) {
            setTimeout(() => {
                useWorkspaceStore.getState().acceptFriend(id);
                notifyEvent({
                    kind: "other",
                    title: "Friend request accepted",
                    body: `${target} accepted your request.`,
                });
            }, 4000);
        }
    };

    const acceptFriend = (id: string) => {
        const f = data.friends?.find((x) => x.id === id);
        if (isLive) {
            acceptFriendRequestApi(id)
                .then((result) => {
                    useToastStore.getState().addToast({
                        title: "Friend added",
                        body: f ? `You and ${f.name} are now friends.` : "You're now friends.",
                        variant: "success",
                    });
                    void ensureDirectDm(
                        {
                            id: result.user.id,
                            name: result.user.displayName || result.user.username,
                            avatar: result.user.avatarUrl,
                            presence: statusToPresence(result.user.status),
                        },
                        { quiet: true },
                    );
                    refreshFriends();
                })
                .catch((err) => {
                    useToastStore.getState().addToast({
                        title: "Failed to accept friend request",
                        body:
                            err instanceof Error ? err.message : "Could not accept friend request.",
                        variant: "error",
                    });
                });
            return;
        }

        workspace.acceptFriend(id);
        useToastStore.getState().addToast({
            title: "Friend added",
            body: f ? `You and ${f.name} are now friends.` : "You're now friends.",
            variant: "success",
        });
    };

    const declineOrRemoveFriend = (id: string) => {
        if (!isLive) {
            workspace.removeFriend(id);
            return;
        }
        const f = data.friends?.find((x) => x.id === id);
        if (!f) return;

        if (f.pending === "incoming") {
            declineFriendRequestApi(id)
                .then(() => {
                    useToastStore.getState().addToast({
                        title: "Request declined",
                        body: `Declined request from @${f.name}.`,
                        variant: "info",
                    });
                    refreshFriends();
                })
                .catch((err) => {
                    useToastStore.getState().addToast({
                        title: "Failed to decline request",
                        body: err instanceof Error ? err.message : "Could not decline request.",
                        variant: "error",
                    });
                });
        } else if (f.pending === "outgoing") {
            cancelFriendRequestApi(id)
                .then(() => {
                    useToastStore.getState().addToast({
                        title: "Request canceled",
                        body: `Canceled request to @${f.name}.`,
                        variant: "info",
                    });
                    refreshFriends();
                })
                .catch((err) => {
                    useToastStore.getState().addToast({
                        title: "Failed to cancel request",
                        body: err instanceof Error ? err.message : "Could not cancel request.",
                        variant: "error",
                    });
                });
        } else {
            removeFriendApi(id)
                .then(() => {
                    useToastStore.getState().addToast({
                        title: "Friend removed",
                        body: `@${f.name} removed from friends.`,
                        variant: "info",
                    });
                    refreshFriends();
                })
                .catch((err) => {
                    useToastStore.getState().addToast({
                        title: "Failed to remove friend",
                        body: err instanceof Error ? err.message : "Could not remove friend.",
                        variant: "error",
                    });
                });
        }
    };

    /* ── Creation flows — spaces, sections, channels, conversations ── */
    const createSpace = (name: string, template: SpaceTemplate) => {
        const spaceId = `sp${Date.now()}`;
        const boards: BoardData[] = [];
        const incidents: Record<string, IncidentMeta> = {};
        const sections: ChannelSection[] = template.blueprint.map((b, si) => ({
            id: `${spaceId}-sec${si}`,
            name: b.section,
            channels: b.channels.map((c, ci) => {
                const id = `${spaceId}-c${si}-${ci}`;
                if (c.type === "board") boards.push(emptyBoard(id, c.name));
                if (c.type === "incident") incidents[id] = newIncident();
                return { id, name: c.name, type: c.type };
            }),
        }));
        if (isLive) {
            createServer({
                name,
                channels: template.blueprint.flatMap((section) =>
                    section.channels.map((channel) => ({
                        name: toApiChannelName(channel.name),
                        type: channel.type,
                        category: section.section,
                    })),
                ),
            })
                .then(async ({ server }) => {
                    appStore.addServer(server);
                    appStore.setChannels(server.channels);
                    await refreshModules(server.id);
                    setShowCreateSpace(false);
                    const firstChannel =
                        server.channels.find((c) => c.type === "text") ?? server.channels[0];
                    if (firstChannel) openChannelIn(server.id, firstChannel.id);
                    useToastStore.getState().addToast({
                        title: "Space created",
                        body: `${name} is synced with Supabase.`,
                        variant: "success",
                    });
                })
                .catch((err) => {
                    useToastStore.getState().addToast({
                        title: "Space failed",
                        body: err instanceof Error ? err.message : "Could not create the space.",
                        variant: "error",
                    });
                });
            return;
        }
        workspace.createSpace({ id: spaceId, name }, sections, { boards, incidents });
        setShowCreateSpace(false);
        const firstChannel = sections.flatMap((s) => s.channels).find((c) => c.type === "text");
        if (firstChannel) openChannelIn(spaceId, firstChannel.id);
        useToastStore.getState().addToast({
            title: "Space created",
            body: `${name} is ready — add channels and sections any time.`,
            variant: "success",
        });
    };

    const openAddChannel = (sectionId: string) => {
        const sec = sections.find((s) => s.id === sectionId);
        setAddChannelTarget({
            spaceId: activeSpaceId,
            sectionId,
            sectionName: sec?.name ?? "this section",
        });
    };

    const addChannel = (name: string, type: ChannelType) => {
        if (!addChannelTarget) return;
        const target = addChannelTarget;
        setAddChannelTarget(null);

        if (isLive) {
            createChannelApi(target.spaceId, {
                name: toApiChannelName(name),
                type,
                category: target.sectionName,
            })
                .then(async ({ channel }) => {
                    appStore.addChannel(channel);
                    await refreshModules(target.spaceId).catch(() => {});
                    selectChannel(channel.id);
                })
                .catch((err) => {
                    useToastStore.getState().addToast({
                        title: "Channel failed",
                        body: err instanceof Error ? err.message : "Could not create the channel.",
                        variant: "error",
                    });
                });
            return;
        }
        const id = `ch${Date.now()}`;
        workspace.addChannel(
            addChannelTarget.spaceId,
            addChannelTarget.sectionId,
            { id, name, type },
            {
                board: type === "board" ? emptyBoard(id, name) : undefined,
                incident: type === "incident" ? newIncident() : undefined,
            },
        );
        setAddChannelTarget(null);
        selectChannel(id);
    };

    const addSection = (name: string) => {
        workspace.addSection(activeSpaceId, { id: `sec${Date.now()}`, name, channels: [] });
        setShowAddSection(false);
    };

    const createConversation = (members: FriendEntry[], name?: string) => {
        setShowNewGroup(false);
        if (members.length === 1) {
            const f = members[0];
            const existing = data.dmConversations?.find(
                (c) => !c.group && (c.id === f.id || c.name === f.name),
            );
            if (existing) {
                openDMs(existing.id);
                return;
            }
            const convo: DMSummary = {
                id: `dm${Date.now()}`,
                name: f.name,
                avatar: f.avatar,
                presence: f.presence,
            };
            workspace.createConversation(convo);
            openDMs(convo.id);
            return;
        }
        const convo: DMSummary = {
            id: `gdm${Date.now()}`,
            name: name || members.map((m) => m.name).join(", "),
            group: members.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar })),
        };
        workspace.createConversation(convo);
        openDMs(convo.id);
    };

    const updateBoardState = (channelId: string, board: BoardData) => {
        if (!isLive) {
            workspace.updateBoard(channelId, board);
            return;
        }
        appStore.upsertBoardState(channelId, board);
        saveBoardState(channelId, board).catch(() => {});
    };

    const updateDocsState = (channelId: string, docs: DocContent[]) => {
        if (!isLive) {
            workspace.updateDocs(channelId, docs);
            return;
        }
        appStore.upsertDocsState(channelId, docs);
        saveDocsState(channelId, docs).catch(() => {});
    };

    const updateIncidentState = (channelId: string, incident: IncidentMeta) => {
        if (!isLive) {
            workspace.updateIncident(channelId, incident);
            return;
        }
        appStore.upsertIncidentState(channelId, incident);
        saveIncidentState(channelId, incident).catch(() => {});
    };

    const connectGitHubState = (channelId: string, prs: PullRequest[]) => {
        if (!isLive) {
            workspace.connectGitHub(channelId, prs);
            return;
        }
        appStore.upsertGitHubState(channelId, prs);
        saveGitHubState(channelId, { pullRequests: prs }).catch(() => {});
    };

    const renderMain = () => {
        if (homeActive) {
            return (
                <HomeView
                    data={data}
                    onOpenChannel={openChannelIn}
                    onOpenDM={openFriendDm}
                    onCallFriend={callFriend}
                    onSendFriendRequest={sendFriendRequest}
                    onSearchFriendUsers={searchFriendUsers}
                    onAcceptFriend={acceptFriend}
                    onDeclineFriend={declineOrRemoveFriend}
                />
            );
        }
        if (dmsActive) {
            return (
                dmConversation && (
                    <div className="flex h-full min-w-0 flex-1 flex-col">
                        {/* Inline call mount — the active call renders here, above the
                messages, when it belongs to this conversation. */}
                        {call?.conversationId === dmConversation.id && (
                            <div ref={setCallHost} className="shrink-0" />
                        )}
                        <MessageArea
                            channelName={dmConversation.name}
                            feedId={dmConversation.id}
                            channelType="text"
                            messages={dmMessages}
                            members={dmConversation.group?.map((g) => ({
                                id: g.id,
                                name: g.name,
                                avatar: g.avatar,
                            }))}
                            dm={{
                                peerId: dmConversation.peerId,
                                avatar: dmConversation.avatar,
                                onVoiceCall: () => startCall(false),
                                onVideoCall: () => startCall(true),
                            }}

                            onOpenThread={setThreadParentId}
                            onOpenSearch={() => setShowSearch(true)}
                            onOpenPins={() => setShowPins((v) => !v)}
                            onRecordClip={() => setRecording(true)}
                            onSend={sendMessage(dmConversation.id)}
                            onReact={toggleReaction(dmConversation.id)}
                            meId={data.me.id}
                            onPin={togglePin(dmConversation.id)}
                            onEdit={editMessage(dmConversation.id)}
                            onDelete={deleteMessage(dmConversation.id)}
                            loading={chatStore.loadingChannels.has(dmConversation.id)}
                            hasMore={chatStore.hasMore[dmConversation.id]}
                            onLoadOlder={loadOlder(dmConversation.id)}
                            onBack={() => setMobileView("channels")}
                        />
                    </div>
                )
            );
        }
        if (!activeChannel) return null;

        switch (activeChannel.type) {
            case "voice":
                return (
                    <VoiceView
                        channelId={activeChannel.id}
                        channelName={activeChannel.name}
                        previewEnabled={!isLive}
                        onBack={() => setMobileView("channels")}
                        participants={
                            data.voiceByChannel?.[activeChannel.id] ??
                            (activeChannel.participants ?? []).map((p) => ({
                                id: p.id,
                                name: p.name,
                                avatar: p.avatar,
                            }))
                        }
                    />
                );
            case "stage":
                return (
                    <StageView
                        channelName={activeChannel.name}
                        onBack={() => setMobileView("channels")}
                        participants={data.voiceByChannel?.[activeChannel.id] ?? []}
                    />
                );
            case "board": {
                const channelId = activeChannel.id;
                const board = data.boardsByChannel?.[channelId] ?? emptyBoard(channelId, activeChannel.name);
                return (
                    <BoardView
                        key={channelId}
                        board={board}
                        onBack={() => setMobileView("channels")}
                        onChange={(b) => updateBoardState(channelId, b)}
                    />
                );
            }
            case "docs": {
                const channelId = activeChannel.id;
                return (
                    <DocsView
                        key={channelId}
                        docs={data.docsByChannel?.[channelId] ?? []}
                        me={data.me}
                        onBack={() => setMobileView("channels")}
                        onChangeDocs={(docs) => updateDocsState(channelId, docs)}
                    />
                );
            }
            case "github": {
                return (
                    <GitHubView
                        key={activeChannel.id}
                        channelId={activeChannel.id}
                        serverId={activeSpaceId}
                        onBack={() => setMobileView("channels")}
                    />
                );
            }
            case "canvas":
                return (
                    <CanvasView
                        key={activeChannel.id}
                        channelName={activeChannel.name}
                        storageKey={activeChannel.id}
                        onBack={() => setMobileView("channels")}
                    />
                );
            case "incident": {
                const channelId = activeChannel.id;
                const incident = data.incidentsByChannel?.[channelId] ?? newIncident();
                return (
                    <IncidentView
                        channelName={activeChannel.name}
                        incident={incident}
                        messages={channelMessages}
                        me={data.me}
                        onBack={() => setMobileView("channels")}
                        onUpdate={(meta) => updateIncidentState(channelId, meta)}
                        onSend={sendMessage(channelId)}
                    />
                );
            }
            default:
                return (
                    <MessageArea
                        channelName={activeChannel.name}
                        feedId={activeChannel.id}
                        channelType={activeChannel.type}
                        topic={activeChannel.type === "text" ? "Keep it constructive." : undefined}
                        messages={channelMessages}
                        members={data.membersBySpace[activeSpaceId]}
                        onToggleMembers={() => setShowMembers((v) => !v)}
                        onOpenThread={setThreadParentId}
                        onOpenSearch={() => setShowSearch(true)}
                        onOpenPins={() => setShowPins((v) => !v)}
                        onRecordClip={() => setRecording(true)}
                        onSend={sendMessage(activeChannel.id)}
                        onReact={toggleReaction(activeChannel.id)}
                        meId={data.me.id}
                        onPin={togglePin(activeChannel.id)}
                        onEdit={editMessage(activeChannel.id)}
                        onDelete={deleteMessage(activeChannel.id)}
                        loading={chatStore.loadingChannels.has(activeChannel.id)}
                        hasMore={chatStore.hasMore[activeChannel.id]}
                        onLoadOlder={loadOlder(activeChannel.id)}
                        onBack={() => setMobileView("channels")}
                    />
                );
        }
    };

    const [mobileView, setMobileView] = useState<"channels" | "chat">("channels");

    const selectChannelAndShowChat = (channelId: string) => {
        selectChannel(channelId);
        setMobileView("chat");
    };

    const openDMsAndShowChat = (conversationId?: string) => {
        openDMs(conversationId);
        if (conversationId) {
            setMobileView("chat");
        } else {
            setMobileView("channels");
        }
    };

    const handleSelectSpace = (id: string) => {
        selectSpace(id);
        setMobileView("channels");
    };

    const renderMainContent = () => {
        return renderMain();
    };

    return (
        <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-[#090c12] text-text-primary">
            {/* Ambient Background Depth Glows */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute -top-40 right-1/3 h-[500px] w-[600px] rounded-full bg-accent/4 blur-[140px]" />
                <div className="absolute -bottom-20 left-1/4 h-[400px] w-[500px] rounded-full bg-accent/3 blur-[120px]" />
            </div>
            {/* Space rail: visible on desktop, or on mobile when in channels view */}
            <div className={cn("relative z-10 h-full shrink-0", mobileView === "chat" && !homeActive ? "hidden md:flex" : "flex")}>
                <NavRail
                    spaces={data.spaces}
                    activeSpaceId={activeSpaceId}
                    homeActive={homeActive}
                    dmsActive={dmsActive}
                    canAccessAdminBoard={["president_admin", "admin", "president"].includes(myRole)}

                    onOpenHome={openHome}
                    onSelectSpace={handleSelectSpace}
                    onOpenDMs={() => openDMsAndShowChat()}
                    onAddSpace={canCreateSpace ? () => setShowCreateSpace(true) : undefined}
                    onOpenSettings={() => setShowSettings({ mode: "user", section: "My Account" })}
                    homeHref={control?.hrefs?.home}
                    dmsHref={control?.hrefs?.dms}
                    spaceHref={control?.hrefs?.space}
                />

            </div>

            {/* Channels / DM list panel: visible on desktop, or on mobile when in channels view */}
            {!homeActive && (
                <div
                    className={cn(
                        "h-full min-w-0 flex-1 md:flex-initial md:w-[248px] shrink-0",
                        mobileView === "chat" ? "hidden md:flex" : "flex"
                    )}
                >
                    {dmsActive ? (
                        <DMPanel
                            conversations={data.dmConversations ?? []}
                            activeId={activeDmId}
                            onSelect={(id) => openDMsAndShowChat(id)}
                            onNewConversation={() => setShowNewGroup(true)}
                            conversationHref={control?.hrefs?.dm}
                            me={data.me}
                            muted={dockMuted}
                            deafened={dockDeafened}
                            onToggleMute={() => setDockMuted((v) => !v)}
                            onToggleDeafen={() => {
                                if (!dockDeafened) setDockMuted(true);
                                setDockDeafened((v) => !v);
                            }}
                            onOpenSettings={() => setShowSettings({ mode: "user", section: "Profile" })}
                            onSetStatus={setMyStatus}
                        />
                    ) : (
                        <SpacePanel
                            spaceName={space?.name ?? "Space"}
                            sections={sections}
                            activeChannelId={activeChannel?.id}
                            me={data.me}
                            onSelectChannel={selectChannelAndShowChat}
                            onOpenSpaceSettings={() => setShowSettings({ mode: "space", section: "Space profile" })}
                            onAddChannel={openAddChannel}
                            onAddSection={() => setShowAddSection(true)}
                            channelHref={control?.hrefs?.channel}
                            muted={dockMuted}
                            deafened={dockDeafened}
                            onToggleMute={() => setDockMuted((v) => !v)}
                            onToggleDeafen={() => {
                                if (!dockDeafened) setDockMuted(true);
                                setDockDeafened((v) => !v);
                            }}
                            onSetStatus={setMyStatus}
                        />
                    )}
                </div>
            )}

            {/* Chat / Message view / Main content: visible on desktop, or on mobile when in chat view */}
            <div
                className={cn(
                    "h-full min-w-0 flex-1 flex-col overflow-hidden",
                    !homeActive && mobileView === "channels" ? "hidden md:flex" : "flex"
                )}
            >
                {renderMainContent()}
            </div>

            {threadParent && !showSearch && !showPins && (
                <ThreadPanel
                    parent={threadParent}
                    replies={(dmsActive ? dmMessages : channelMessages).filter(
                        (m) => m.replyTo?.id === threadParent.id,
                    )}
                    meId={data.me.id}
                    onSend={(text, attachments, replyTo) => {
                        const targetId = dmsActive ? activeDmId : activeChannel?.id;
                        if (targetId) sendMessage(targetId)(text, attachments, replyTo);
                    }}
                    onReact={(msgId, emoji) => {
                        const targetId = dmsActive ? activeDmId : activeChannel?.id;
                        if (targetId) toggleReaction(targetId)(msgId, emoji);
                    }}
                    onPin={(msgId) => {
                        const targetId = dmsActive ? activeDmId : activeChannel?.id;
                        if (targetId) togglePin(targetId)(msgId);
                    }}
                    onEdit={(msgId, text) => {
                        const targetId = dmsActive ? activeDmId : activeChannel?.id;
                        if (targetId) void editMessage(targetId)(msgId, text);
                    }}
                    onDelete={(msgId) => {
                        const targetId = dmsActive ? activeDmId : activeChannel?.id;
                        if (targetId) void deleteMessage(targetId)(msgId);
                    }}
                    onClose={() => setThreadParentId(null)}
                />
            )}

            {showSearch && (
                <SearchPanel
                    corpus={searchCorpus}
                    spaceId={activeSpaceId}
                    onSelectMessage={(channelId) => {
                        if (channelId) {
                            selectChannel(channelId);
                            setShowSearch(false);
                        }
                    }}
                    onClose={() => setShowSearch(false)}
                />
            )}




            {showPins && !showSearch && !homeActive && (
                <PinnedPanel
                    messages={dmsActive ? dmMessages : channelMessages}
                    onClose={() => setShowPins(false)}
                />
            )}

            {showMembers && !dmsActive && !showSearch && !showPins && !homeActive && (
                <MemberPanel
                    members={data.membersBySpace[activeSpaceId] ?? []}
                    onClose={() => setShowMembers(false)}
                />
            )}

            {recording && <ClipRecorder onStop={finishClip} onCancel={() => setRecording(false)} />}

            {call && (
                <CallSession
                    key={call.conversationId}
                    call={call}
                    me={{ id: data.me.id, name: data.me.name, avatar: data.me.avatar }}
                    inlineHost={callHost}
                    initialMuted={dockMuted}
                    initialDeafened={dockDeafened}
                    onJump={() => openDMs(call.conversationId)}
                    onEnd={endCall}
                />
            )}

            {incoming && !call && (
                <IncomingCallCard
                    caller={incoming.caller}
                    video={incoming.video}
                    onAccept={() => {
                        const { caller, video, conversationId } = incoming;
                        void (async () => {
                            try {
                                const transport = isLive
                                    ? await joinDMCall(conversationId)
                                    : undefined;
                                setCall({
                                    conversationId,
                                    peers: [caller],
                                    video,
                                    name: caller.name,
                                    status: "connected",
                                    transport,
                                });

                                openDMs(conversationId);
                                setIncoming(null);
                            } catch (error) {
                                useToastStore.getState().addToast({
                                    title: "Could not join call",
                                    body:
                                        error instanceof Error
                                            ? error.message
                                            : "The call may have ended.",
                                    variant: "error",
                                });
                            }
                        })();
                    }}
                    onDecline={() => {
                        const { caller, video, conversationId } = incoming;
                        const convo = convoForCaller(caller);
                        if (isLive) void declineDMCall(conversationId).catch(() => undefined);
                        if (convo) {
                            logCall(
                                convo.id,
                                { id: caller.id, name: caller.name, avatar: caller.avatar },
                                {
                                    kind: video ? "video" : "voice",
                                    missed: true,
                                },
                            );
                        }
                        setIncoming(null);
                    }}
                />
            )}

            {showSettings && (
                <SettingsView
                    spaceId={typeof showSettings === "object" && showSettings.mode === "user" ? undefined : activeSpaceId}
                    spaceName={space?.name}
                    sections={sections}
                    members={data.membersBySpace[activeSpaceId]}
                    mode={typeof showSettings === "object" ? showSettings.mode : "all"}
                    initialSection={typeof showSettings === "object" ? showSettings.section : undefined}
                    onClose={() => setShowSettings(false)}
                    onRenameSpace={(name) => {
                        if (!isLive) {
                            workspace.renameSpace(activeSpaceId, name);
                            return;
                        }
                        updateServerApi(activeSpaceId, { name })
                            .then(({ server }) => appStore.updateServer(activeSpaceId, server))
                            .catch((err) => {
                                useToastStore.getState().addToast({
                                    title: "Rename failed",
                                    body:
                                        err instanceof Error
                                            ? err.message
                                            : "Could not rename this space.",
                                    variant: "error",
                                });
                            });
                    }}
                    onDeleteSpace={() => {
                        if (isLive) {
                            deleteServerApi(activeSpaceId)
                                .then(() => appStore.removeServer(activeSpaceId))
                                .catch((err) => {
                                    useToastStore.getState().addToast({
                                        title: "Delete failed",
                                        body:
                                            err instanceof Error
                                                ? err.message
                                                : "Could not delete this space.",
                                        variant: "error",
                                    });
                                });
                        } else {
                            workspace.deleteSpace(activeSpaceId);
                        }
                        setShowSettings(false);
                        openHome();
                    }}
                    onDeleteChannel={(id) => {
                        if (isLive) {
                            deleteChannelApi(id)
                                .then(() => appStore.removeChannel(id))
                                .catch((err) => {
                                    useToastStore.getState().addToast({
                                        title: "Delete failed",
                                        body:
                                            err instanceof Error
                                                ? err.message
                                                : "Could not delete this channel.",
                                        variant: "error",
                                    });
                                });
                            return;
                        }
                        workspace.removeChannel(id);
                    }}
                    onAddChannel={(sectionId) => {
                        setShowSettings(false);
                        openAddChannel(sectionId);
                    }}
                    onRemoveMember={(id) => workspace.removeMember(activeSpaceId, id)}
                />
            )}

            {showCreateSpace && (
                <CreateSpaceDialog
                    onCreate={createSpace}
                    onClose={() => setShowCreateSpace(false)}
                />
            )}
            {addChannelTarget && (
                <AddChannelDialog
                    sectionName={addChannelTarget.sectionName}
                    onCreate={addChannel}
                    onClose={() => setAddChannelTarget(null)}
                />
            )}
            {showAddSection && (
                <AddSectionDialog onCreate={addSection} onClose={() => setShowAddSection(false)} />
            )}
            {showNewGroup && (
                <NewGroupDialog
                    friends={data.friends ?? []}
                    onCreate={createConversation}
                    onClose={() => setShowNewGroup(false)}
                />
            )}

            <ToastViewport />
        </div>
    );
}
