# AIIC Next.js → Expo React Native Migration Progress

## 1. Migration Overview & Architecture

### Backend & API Architecture
- Authoritative backend: Next.js API Routes (`apps/web/app/api/*`) and Hono API (`apps/api/*`), Supabase (PostgreSQL, Auth, Storage, Realtime), LiveKit SFU.
- Native mobile app (`apps/mobile`) connects to `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

### Screen & Route Inventory

| Route | Web Path | Mobile Destination (Expo Router) | Mode / Strategy | Status |
|---|---|---|---|---|
| Landing / Home | `/` | `apps/mobile/src/app/index.tsx` | Nativize Now | ✅ Completed |
| Login | `/login` | `apps/mobile/src/app/(auth)/login.tsx` | Nativize Now | ✅ Completed |
| Register | `/register` | `apps/mobile/src/app/(auth)/register.tsx` | Nativize Now | ✅ Completed |
| Forgot / Reset PW | `/forgot-password`, `/reset-password` | `apps/mobile/src/app/(auth)/forgot-password.tsx` | Nativize Now | ✅ Completed |
| Spaces & Channels Workspace | `/spaces/[[...slug]]` | `apps/mobile/src/app/(app)/spaces/[spaceId]/[channelId].tsx` | Nativize Now (Full Native UI) | ✅ Completed |
| Direct Messages | `/spaces` (DM view) | `apps/mobile/src/app/(app)/dms/index.tsx`, `[id].tsx` | Nativize Now (Full Native UI) | ✅ Completed |
| Voice & Stage Channel | LiveKit Voice / Stage | `apps/mobile/src/app/(app)/voice/[id].tsx` | Nativize Now | ✅ Completed |
| Boards (Kanban) | Spaces Module | `apps/mobile/src/app/(app)/boards/[id].tsx` | Nativize Now | ✅ Completed |
| Docs Module | Spaces Module | `apps/mobile/src/app/(app)/docs/[id].tsx` | Nativize Now | ✅ Completed |
| Projects & Project Detail | `/projects`, `/projects/[slug]` | `apps/mobile/src/app/(app)/projects/index.tsx`, `[slug].tsx` | Nativize Now | ✅ Completed |
| Events & Event Detail | `/events`, `/events/[slug]` | `apps/mobile/src/app/(app)/events/index.tsx`, `[slug].tsx` | Nativize Now | ✅ Completed |
| Archive & Repositories | `/archive`, `/archive/[id]` | `apps/mobile/src/app/(app)/archive/index.tsx` | Nativize Now | ✅ Completed |
| People & Members | `/people` | `apps/mobile/src/app/(app)/people/index.tsx` | Nativize Now | ✅ Completed |
| Achievements | `/achievements` | `apps/mobile/src/app/(app)/achievements/index.tsx` | Nativize Now | ✅ Completed |
| Notices & Announcements | `/notices` | `apps/mobile/src/app/(app)/notices/index.tsx` | Nativize Now | ✅ Completed |
| User Profile & Settings | `/profile`, `/profile/settings` | `apps/mobile/src/app/(app)/profile/index.tsx` | Nativize Now | ✅ Completed |
| Notifications Center | `/notifications` | `apps/mobile/src/app/(app)/notifications/index.tsx` | Nativize Now | ✅ Completed |
| Admin Panel | `/admin/*` | `apps/mobile/src/app/(admin)/index.tsx` | Nativize Now | ✅ Completed |

## 2. Migration Phases Checklist
- [x] Step 1: Complete audit & roadmap creation (`migration-progress.md`)
- [x] Step 2: Scaffold `apps/mobile` Expo React Native application with Expo Router & Glassmora design tokens
- [x] Step 3: Shared logic & client adapters (Supabase auth with SecureStore/AsyncStorage, REST API client, Realtime subscriptions, Zustand stores)
- [x] Step 4: Core UI components (Glassmorphism containers, buttons, avatars, inputs, headers, badges, presence dots)
- [x] Step 5: Screen implementations (Auth, Spaces/Channels, DMs, Message Feed & Composer, Voice/Stage SFU, Kanban Boards, Docs, Projects, Events, Archive, People Directory, Achievements, Notices, Profile/Settings, Governance & Admin)
- [x] Step 6: Verify and validate mobile app builds and clean TypeScript typecheck
