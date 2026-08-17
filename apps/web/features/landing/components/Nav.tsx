"use client";

import React from "react";
import {
  Home,
  MessageSquare,
  Bell,
  Archive,
  Users,
  User as UserIcon,
  Shield,
  LogIn,
  LogOut,
} from "lucide-react";

import { NavBar, NavItem } from "@/shared/components/ui/tubelight-navbar";
import { useAuthStore } from "@/features/auth";
import { usePathname, useRouter } from "next/navigation";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  /*
   * The authentication pages should not display
   * the global navigation.
   */
  if (
    pathname === "/auth/signin" ||
    pathname === "/auth/signup" ||
    pathname === "/login"
  ) {
    return null;
  }

  const baseNavItems: NavItem[] = [
    {
      name: "Home",
      url: "/",
      icon: Home,
    },
    {
      name: "Chat",
      url: "/spaces",
      icon: MessageSquare,
    },
    {
      name: "Notifications",
      url: "/notifications",
      icon: Bell,
    },
    {
      name: "Archive",
      url: "/archive",
      icon: Archive,
    },
    {
      name: "Members",
      url: "/people",
      icon: Users,
    },
  ];

  const navItems = [...baseNavItems];

  /*
   * Role-based navigation / Admin
   */
  if (isAuthenticated) {
    navItems.push({
      name: "Admin",
      url: "/admin",
      icon: Shield,
    });
  }

  /*
   * Existing users:
   * Profile + Sign Out
   *
   * No public Sign Up.
   * No recruitment flow.
   */
  if (isAuthenticated && user) {
    navItems.push({
      name: user.displayName ? user.displayName.split(" ")[0] : "Profile",
      url: "/profile",
      icon: UserIcon,
    });

    navItems.push({
      name: "Sign Out",
      url: "#",
      icon: LogOut,
      onClick: async () => {
        logout();
        router.push("/");
        router.refresh();
      },
    });
  } else {
    /*
     * Existing users are already registered.
     * Only provide Sign In for unauthenticated users.
     */
    navItems.push({
      name: "Sign In",
      url: "/login",
      icon: LogIn,
    });
  }

  return <NavBar items={navItems} />;
}

export const GlobalNavigation = Navbar;
export const Nav = Navbar;
export default Navbar;
