"use client";

import { GlobalNavigation, Footer } from "@/features/landing";
import { ProfileNav } from "@/features/profile/components/ProfileNav";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background text-text-primary">
      <GlobalNavigation />

      <main className="mx-auto max-w-[1080px] px-4 py-12 sm:px-6 sm:py-16 md:py-20 pb-24 md:pb-16">
        <ProfileNav />
        {children}
      </main>

      <Footer />
    </div>
  );
}
