import { useEffect } from "react";
import { create } from "zustand";
import { api } from "./api";
import { useAuthStore } from "@/features/auth/store/auth-store";

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
            const authUser = useAuthStore.getState().user;
            const fallbackRole = authUser?.role || "visitor";
            const fallbackRoleName = authUser?.role === "president_admin" ? "President + Admin" : (authUser?.role || "Visitor");
            set({
                role: fallbackRole,
                roleName: fallbackRoleName,
                hierarchyLevel: ["president_admin", "admin", "president"].includes(fallbackRole) ? 100 : 10,
                permissions: new Set(["MESSAGE_SEND", "REACTION_ADD", "BOARD_VIEW", "DOCS_VIEW"]),
                isTeamLeader: false,
                loading: false,
                initialized: true,
            });
        }
    },

    can: (permissionKey: string) => {
        const { role, permissions } = get();
        const authRole = useAuthStore.getState().user?.role;
        const effectiveRole = (authRole || role || "").toLowerCase().trim();
        if (["admin", "president", "president_admin"].includes(effectiveRole)) return true;
        return permissions.has(permissionKey);
    },

    hasAny: (permissionKeys: string[]) => {
        const { role, permissions } = get();
        const authRole = useAuthStore.getState().user?.role;
        const effectiveRole = (authRole || role || "").toLowerCase().trim();
        if (["admin", "president", "president_admin"].includes(effectiveRole)) return true;
        return permissionKeys.some((k) => permissions.has(k));
    },

    hasAll: (permissionKeys: string[]) => {
        const { role, permissions } = get();
        const authRole = useAuthStore.getState().user?.role;
        const effectiveRole = (authRole || role || "").toLowerCase().trim();
        if (["admin", "president", "president_admin"].includes(effectiveRole)) return true;
        return permissionKeys.every((k) => permissions.has(k));
    },
}));

/** Reactive hook to check permissions in any component */
export function usePermissions(spaceId?: string) {
    const store = usePermissionStore();
    const authUser = useAuthStore((s) => s.user);

    useEffect(() => {
        if (spaceId && (store.spaceId !== spaceId || !store.initialized) && !store.loading) {
            void store.fetchPermissions(spaceId);
        }
    }, [spaceId, store.spaceId, store.initialized, store.loading]);

    const effectiveRole = (store.role && store.role !== "visitor") ? store.role : (authUser?.role || store.role || "visitor");
    const effectiveRoleName = (store.roleName && store.roleName !== "Visitor") ? store.roleName : (authUser?.role === "president_admin" ? "President + Admin" : authUser?.role || store.roleName || "Visitor");
    const effectiveHierarchy = ["president_admin", "president", "admin"].includes(effectiveRole) ? 100 : store.hierarchyLevel;

    return {
        role: effectiveRole,
        roleName: effectiveRoleName,
        hierarchyLevel: effectiveHierarchy,
        isTeamLeader: store.isTeamLeader,
        loading: store.loading,
        initialized: store.initialized,
        can: store.can,
        hasAny: store.hasAny,
        hasAll: store.hasAll,
        refetch: () => spaceId && store.fetchPermissions(spaceId),
    };
}

