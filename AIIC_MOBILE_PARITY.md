# 📋 AIIC Mobile vs. Web Master Feature Parity Matrix

| Feature Domain | Web Route / Reference | Mobile Component / Route | Supabase Source / API | State / Realtime / Permissions | Parity Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication (Native OAuth)** | `/login`, `/auth/callback` | `(auth)/login.tsx`, `_layout.tsx` | Supabase Auth PKCE | Deep-link `aiic://auth/callback` with PKCE exchange | ✅ Complete |
| **User Identity & Dock** | Bottom left sidebar dock | `SpaceRail` dock & `(app)/profile` | `profiles` table | Live presence indicator + verified role tag | ✅ Complete |
| **Permissions & Authority** | `can("...")` role hierarchy | `useAuthStore` + `lib/permissions.ts` | `profiles.role` | Roles: `admin`, `president`, `staff`, `lead`, `member` | ✅ Complete |
| **Space Selector (Level 1)** | Leftmost Space Rail | `SpaceRail` | `spaces` / `/api/spaces` | 9 Space archetypes with active highlights & badges | ✅ Complete |
| **Space Workspace (Level 2)** | Full channel selector | `SelectedSpaceView` | `channels` / `/api/spaces/[id]` | No `#general` side-by-side leak; 0 bottom tabs | ✅ Complete |
| **Search Subsystem** | Global modal search | `SearchModal` | `/friends/search?query=...` | Debounced user search + instantaneous channel filter | ✅ Complete |
| **Notice & Announcements** | Space notice banner | `SelectedSpaceView` + `NoticePage` | `/api/announcements` | Role-gated `+ Publish` modal (`canCreateNotice`) | ✅ Complete |
| **Direct Messages (DMs)** | `/dms`, DM sidebar | `SpaceRail` DM & `(app)/dms/` | `dms`, `dm_messages` | Realtime sync, user presence, friend discovery | ✅ Complete |
| **Channel Routing** | `ChannelRouter` | `ChannelRouter` | `channels.type` | 9 distinct renderers (no generic fallback flattening) | ✅ Complete |
| **Text Channels** | `#general`, `MessageFeed` | `TextChannelScreen` | `channel_messages` | Attachments, markdown, mentions, reactions | ✅ Complete |
| **Voice Channels** | `CallSurface.tsx` | `VoiceChannelView` | WebRTC audio SFU | Speaking grid, mute, deafen, disconnect | ✅ Complete |
| **Live / Stage Channels** | `StageView.tsx` | `VoiceChannelView (isStage=true)` | WebRTC audio SFU | ON STAGE vs AUDIENCE, "Raise Hand" toggle | ✅ Complete |
| **Incident War Rooms** | `IncidentView.tsx` | `IncidentChannelView` | `channel_incidents` | Status (`ACTIVE`/`RESOLVED`), Severity (`P0`–`P3`), Timeline | ✅ Complete |
| **Collaborative Canvas** | `CanvasView.tsx` | `CanvasChannelView` | `channel_canvas` | Vector tools (Pen, Rect, Circle, Arrow, Text, Eraser) | ✅ Complete |
| **Historical Archives** | `/archive` | `ArchivePage` & `(app)/archive` | `/api/archive/records` | Session records, repository tags, document metadata | ✅ Complete |
| **Governance & Admin** | `/admin` | `AdminPage` & `(app)/admin` | `/api/admin/overview` | Gated by `isAdmin` / `isPresident`; live cluster stats | ✅ Complete |
| **Aesthetics & Glassmorphism**| Glassmora design system | Vanilla styles + theme tokens | `colors`, `borderGlass` | Iridescent translucent panels, zero generic borders | ✅ Complete |
