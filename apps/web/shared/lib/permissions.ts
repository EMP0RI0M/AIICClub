import { useEffect } from "react";
import { create } from "zustand";
import { api } from "./api";

export interface UserPermissionsState {
    role: string;
    roleName: string;
    hierarchyLevel: number;
    permissions: Set<string>;
    isTeamLeader: boolean;
    loading: boolean;
    initialized: boolean;
    spaceId: string | null;
    fetchPermissions: (spaceId: string) => Promise<void>;
    can: (permissionKey: string) => boolean;
    hasAny: (permissionKeys: string[]) => boolean;
    hasAll: (permissionKeys: string[]) => boolean;
}

export const usePermissionStore = create<UserPermissionsState>((set, get) => ({
    role: "visitor",
    roleName: "Visitor",
    hierarchyLevel: 10,
    permissions: new Set<string>(),
    isTeamLeader: false,
    loading: false,
    initialized: false,
    spaceId: null,

    fetchPermissions: async (spaceId: string) => {
        if (!spaceId) return;
        set({ loading: true, spaceId });
        try {
            const data = await api<{
                role: string;
                roleName: string;
                hierarchyLevel: number;
                permissions: string[];
                isTeamLeader: boolean;
            }>(`/org/permissions?spaceId=${encodeURIComponent(spaceId)}`);

            set({
                role: data.role || "visitor",
                roleName: data.roleName || "Visitor",
                hierarchyLevel: data.hierarchyLevel || 10,
                permissions: new Set(data.permissions || []),
                isTeamLeader: Boolean(data.isTeamLeader),
                loading: false,
                initialized: true,
            });
        } catch (err) {
            console.error("[PERMISSIONS] Fetch error:", err);
            // Default safe visitor fallback
            set({
                role: "visitor",
                roleName: "Visitor",
                hierarchyLevel: 10,
                permissions: new Set(["MESSAGE_SEND", "REACTION_ADD", "BOARD_VIEW", "DOCS_VIEW"]),
                isTeamLeader: false,
                loading: false,
                initialized: true,
            });
        }
    },

    can: (permissionKey: string) => {
        const { role, permissions } = get();
        const r = (role || "").toLowerCase().trim();
        if (r === "admin" || r === "president" || r === "president_admin") return true;
        return permissions.has(permissionKey);
    },

    hasAny: (permissionKeys: string[]) => {
        const { role, permissions } = get();
        const r = (role || "").toLowerCase().trim();
        if (r === "admin" || r === "president" || r === "president_admin") return true;
        return permissionKeys.some((k) => permissions.has(k));
    },

    hasAll: (permissionKeys: string[]) => {
        const { role, permissions } = get();
        const r = (role || "").toLowerCase().trim();
        if (r === "admin" || r === "president" || r === "president_admin") return true;
        return permissionKeys.every((k) => permissions.has(k));
    },
}));

/** Reactive hook to check permissions in any component */
export function usePermissions(spaceId?: string) {
    const store = usePermissionStore();

    useEffect(() => {
        if (spaceId && (store.spaceId !== spaceId || !store.initialized) && !store.loading) {
            void store.fetchPermissions(spaceId);
        }
    }, [spaceId, store.spaceId, store.initialized, store.loading]);

    return {
        role: store.role,
        roleName: store.roleName,
        hierarchyLevel: store.hierarchyLevel,
        isTeamLeader: store.isTeamLeader,
        loading: store.loading,
        initialized: store.initialized,
        can: store.can,
        hasAny: store.hasAny,
        hasAll: store.hasAll,
        refetch: () => spaceId && store.fetchPermissions(spaceId),
    };
}

