"use client";

import { FullUserSettings } from "@/features/profile/components/FullUserSettings";

export default function ProfileSettingsPage() {
  return (
    <div className="w-full">
      <FullUserSettings initialSection="account" />
    </div>
  );
}
