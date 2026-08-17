import { create } from "zustand";
import { getSupabaseClient } from "../lib/supabase";
import { NativeStorage } from "../lib/storage";
import { api, setAuthToken } from "../lib/api";

export interface User {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  status: "online" | "idle" | "dnd" | "invisible" | "offline";
  onboardingCompleted: boolean;
  role?: string | null;
  classYear?: string | null;
  section?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  interests?: string[];
  skills?: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoring: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    displayName: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<{ confirmEmail: boolean }>;
  restoreSession: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  completeOnboarding: () => Promise<void>;
  setStatus: (status: User["status"]) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isRestoring: true,

  login: async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    set({ isLoading: true });
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;
      if (!data.session) throw new Error("Sign in succeeded but no session was created.");

      const accessToken = data.session.access_token;
      setAuthToken(accessToken);

      // Fetch official user record from /api/auth/profile
      let profileUser: User;
      try {
        const profileRes = await api<{ user: User }>("/auth/profile");
        profileUser = profileRes.user;
      } catch {
        profileUser = {
          id: data.user.id,
          email: normalizedEmail,
          displayName: data.user.user_metadata?.displayName || normalizedEmail.split("@")[0],
          username: data.user.user_metadata?.username || normalizedEmail.split("@")[0],
          avatar: data.user.user_metadata?.avatar_url || null,
          bio: null,
          status: "online",
          onboardingCompleted: true,
        };
      }

      await NativeStorage.setItem("aiic_user_session", JSON.stringify(profileUser));
      set({
        user: profileUser,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const supabase = getSupabaseClient();
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: {
          data: {
            displayName: data.displayName.trim(),
            username: data.username.trim().toLowerCase(),
          },
        },
      });

      if (error) throw error;
      const needsConfirmation = !authData.session;

      if (authData.session) {
        const accessToken = authData.session.access_token;
        setAuthToken(accessToken);
        const newUser: User = {
          id: authData.user?.id || "user-new",
          email: data.email,
          displayName: data.displayName,
          username: data.username,
          avatar: null,
          bio: null,
          status: "online",
          onboardingCompleted: false,
        };
        await NativeStorage.setItem("aiic_user_session", JSON.stringify(newUser));
        set({
          user: newUser,
          token: accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }

      return { confirmEmail: needsConfirmation };
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  restoreSession: async () => {
    set({ isRestoring: true });
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (token) {
        setAuthToken(token);
        const cachedUserStr = await NativeStorage.getItem("aiic_user_session");
        let restoredUser: User | null = cachedUserStr ? JSON.parse(cachedUserStr) : null;

        try {
          const profileRes = await api<{ user: User }>("/auth/profile");
          restoredUser = profileRes.user;
          await NativeStorage.setItem("aiic_user_session", JSON.stringify(restoredUser));
        } catch (err) {
          console.warn("[AuthStore] restore profile error:", err);
        }

        if (restoredUser) {
          set({
            user: restoredUser,
            token,
            isAuthenticated: true,
            isRestoring: false,
          });
          return true;
        }
      }

      // Check stored token directly if getSession did not trigger yet
      const savedToken = await NativeStorage.getItem("aiic_auth_token");
      if (savedToken) {
        setAuthToken(savedToken);
        try {
          const profileRes = await api<{ user: User }>("/auth/profile");
          if (profileRes?.user) {
            set({
              user: profileRes.user,
              token: savedToken,
              isAuthenticated: true,
              isRestoring: false,
            });
            return true;
          }
        } catch {}
      }

      set({ isRestoring: false, isAuthenticated: false, user: null, token: null });
      return false;
    } catch {
      set({ isRestoring: false, isAuthenticated: false, user: null, token: null });
      return false;
    }
  },

  logout: async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch {}
    setAuthToken(null);
    await NativeStorage.removeItem("aiic_user_session");
    await NativeStorage.removeItem("aiic_auth_token");
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  updateUser: (data) =>
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...data };
      NativeStorage.setItem("aiic_user_session", JSON.stringify(updated));
      return { user: updated };
    }),

  completeOnboarding: async () => {
    const { user } = get();
    if (!user) return;
    try {
      await api("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ onboardingCompleted: true }),
      });
      get().updateUser({ onboardingCompleted: true });
    } catch {
      get().updateUser({ onboardingCompleted: true });
    }
  },

  setStatus: (status) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, status };
      NativeStorage.setItem("aiic_user_session", JSON.stringify(updated));
      return { user: updated };
    });
    api("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }).catch(() => {});
  },
}));
