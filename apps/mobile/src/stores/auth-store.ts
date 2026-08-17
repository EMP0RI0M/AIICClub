import { create } from "zustand";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { getSupabaseClient } from "../lib/supabase";
import { NativeStorage } from "../lib/storage";
import { api, setAuthToken } from "../lib/api";

WebBrowser.maybeCompleteAuthSession();

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
  loginWithOAuth: (provider: "google" | "github") => Promise<void>;
  handleOAuthCallback: (url: string) => Promise<boolean>;
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
          displayName: data.user.user_metadata?.displayName || data.user.user_metadata?.full_name || normalizedEmail.split("@")[0],
          username: data.user.user_metadata?.username || normalizedEmail.split("@")[0],
          avatar: data.user.user_metadata?.avatar_url || null,
          bio: null,
          status: "online",
          onboardingCompleted: true,
        };
      }

      await NativeStorage.setItem("aiic_user_session", JSON.stringify(profileUser));
      await NativeStorage.setItem("aiic_auth_token", accessToken);
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

  handleOAuthCallback: async (url: string) => {
    console.log("[AIIC OAuth] callback received:", url);
    try {
      const supabase = getSupabaseClient();

      // Check if URL has PKCE code (?code=XXXX) or implicit token fragment (#access_token=XXXX)
      const { params, errorCode } = QueryParams.getQueryParams(url);
      if (errorCode) {
        throw new Error(errorCode);
      }

      if (params.code) {
        console.log("[AIIC OAuth] exchanging PKCE code for session");
        const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) throw error;
      } else if (params.access_token) {
        console.log("[AIIC OAuth] setting session from token");
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token || "",
        });
        if (error) throw error;
      }

      // Verify established session
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        console.log("[AIIC OAuth] session established");
        const accessToken = sessionData.session.access_token;
        setAuthToken(accessToken);

        let profileUser: User;
        try {
          const profileRes = await api<{ user: User }>("/auth/profile");
          profileUser = profileRes.user;
        } catch {
          const u = sessionData.session.user;
          const email = u.email || "";
          profileUser = {
            id: u.id,
            email,
            displayName: u.user_metadata?.displayName || u.user_metadata?.full_name || u.user_metadata?.user_name || email.split("@")[0] || "Member",
            username: u.user_metadata?.username || u.user_metadata?.user_name || email.split("@")[0] || "member",
            avatar: u.user_metadata?.avatar_url || null,
            bio: null,
            status: "online",
            onboardingCompleted: true,
          };
        }

        await NativeStorage.setItem("aiic_user_session", JSON.stringify(profileUser));
        await NativeStorage.setItem("aiic_auth_token", accessToken);
        set({
          user: profileUser,
          token: accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error("[AIIC OAuth] error establishing session from callback:", err);
      return false;
    }
  },

  loginWithOAuth: async (provider: "google" | "github") => {
    console.log(`[AIIC OAuth] starting ${provider} OAuth`);
    set({ isLoading: true });
    try {
      const supabase = getSupabaseClient();
      const redirectTo = "aiic://auth/callback";
      console.log("[AIIC OAuth] redirect URI:", redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error("[AIIC OAuth] error:", error);
        throw error;
      }
      if (!data?.url) throw new Error("No authorization URL returned from Supabase.");

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      if (result.type === "success" && result.url) {
        await get().handleOAuthCallback(result.url);
      } else {
        // In case deep linking resumed outside WebBrowser return
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          const accessToken = sessionData.session.access_token;
          setAuthToken(accessToken);
          let profileUser: User;
          try {
            const profileRes = await api<{ user: User }>("/auth/profile");
            profileUser = profileRes.user;
          } catch {
            const u = sessionData.session.user;
            const email = u.email || "";
            profileUser = {
              id: u.id,
              email,
              displayName: u.user_metadata?.displayName || u.user_metadata?.full_name || email.split("@")[0] || "Member",
              username: u.user_metadata?.username || email.split("@")[0] || "member",
              avatar: u.user_metadata?.avatar_url || null,
              bio: null,
              status: "online",
              onboardingCompleted: true,
            };
          }
          await NativeStorage.setItem("aiic_user_session", JSON.stringify(profileUser));
          await NativeStorage.setItem("aiic_auth_token", accessToken);
          set({
            user: profileUser,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }
      }
    } catch (err) {
      console.error("[AIIC OAuth] error:", err);
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
        await NativeStorage.setItem("aiic_auth_token", accessToken);
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
