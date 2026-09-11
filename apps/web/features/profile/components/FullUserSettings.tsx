"use client";

import React, { useState } from "react";
import { cn } from "@corvus/ui";
import {
  User,
  UserCheck,
  Shield,
  Bell,
  Palette,
  Keyboard,
  Mic,
  Sliders,
  ChevronRight,
} from "lucide-react";
import {
  MyAccountSettings,
  ProfileSettings,
  PrivacySettings,
  NotificationsSettings,
  AppearanceSettings,
  KeybindingsSettings,
  DevicesSettings,
  AdvancedSettings,
} from "@/features/workspace/components/UserSettings";

export const SETTINGS_SECTIONS = [
  {
    group: "User Settings",
    items: [
      { id: "account", label: "My Account", icon: User },
      { id: "profile", label: "Profile", icon: UserCheck },
      { id: "privacy", label: "Privacy", icon: Shield },
    ],
  },
  {
    group: "App Preferences",
    items: [
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "appearance", label: "Appearance", icon: Palette },
      { id: "keybindings", label: "Keybindings", icon: Keyboard },
    ],
  },
  {
    group: "System",
    items: [
      { id: "devices", label: "Devices & Audio", icon: Mic },
      { id: "advanced", label: "Advanced", icon: Sliders },
    ],
  },
];

interface FullUserSettingsProps {
  initialSection?: string;
}

export function FullUserSettings({ initialSection = "account" }: FullUserSettingsProps) {
  const [activeSection, setActiveSection] = useState(initialSection);

  const renderSectionContent = () => {
    switch (activeSection) {
      case "account":
        return <MyAccountSettings />;
      case "profile":
        return <ProfileSettings />;
      case "privacy":
        return <PrivacySettings />;
      case "notifications":
        return <NotificationsSettings />;
      case "appearance":
        return <AppearanceSettings />;
      case "keybindings":
        return <KeybindingsSettings />;
      case "devices":
        return <DevicesSettings />;
      case "advanced":
        return <AdvancedSettings />;
      default:
        return <MyAccountSettings />;
    }
  };

  const activeMeta = SETTINGS_SECTIONS.flatMap((g) => g.items).find(
    (i) => i.id === activeSection
  ) || SETTINGS_SECTIONS[0].items[0];

  return (
    <div className="flex w-full flex-col md:flex-row gap-6 md:gap-8 min-w-0">
      {/* ─── Mobile Horizontal Selector (< md) ─── */}
      <div className="flex md:hidden overflow-x-auto pb-2.5 gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-white/[0.08] px-0.5">
        {SETTINGS_SECTIONS.flatMap((g) => g.items).map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 font-mono text-xs font-semibold whitespace-nowrap transition-all",
                isActive
                  ? "bg-accent/15 border border-accent/40 text-accent shadow-sm"
                  : "bg-[#0a0a0a] border border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-white"
              )}
            >
              <Icon size={13} className={isActive ? "text-accent" : "text-zinc-500"} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Desktop Vertical Sidebar (md+) ─── */}
      <nav
        aria-label="Settings Categories"
        className="hidden md:flex md:w-[220px] lg:w-[240px] shrink-0 flex-col gap-4 rounded-2xl aiic-dark-glass p-3.5 h-fit shadow-xl"
      >
        {SETTINGS_SECTIONS.map((group) => (
          <div key={group.group} className="flex flex-col gap-1">
            <span className="px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {group.group}
            </span>
            {group.items.map((item) => {
              const isActive = activeSection === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "flex h-8.5 items-center justify-between rounded-lg px-2.5 text-[13px] font-medium transition-all text-left",
                    isActive
                      ? "bg-white/[0.06] text-white font-semibold border-l-2 border-accent"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <Icon size={14} className={isActive ? "text-accent" : "text-zinc-500"} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isActive && <ChevronRight size={12} className="text-accent shrink-0" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ─── Settings Content View ─── */}
      <div className="flex-1 min-w-0 rounded-2xl aiic-dark-glass p-5 sm:p-7 md:p-8 shadow-xl overflow-hidden">
        <div className="border-b border-white/[0.06] pb-4 mb-6">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <activeMeta.icon size={20} className="text-accent" />
            {activeMeta.label}
          </h2>
        </div>

        <div className="w-full min-w-0 max-w-full">
          {renderSectionContent()}
        </div>
      </div>
    </div>
  );
}

export default FullUserSettings;
