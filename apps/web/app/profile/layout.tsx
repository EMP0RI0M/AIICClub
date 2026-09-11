"use client";

import { GlobalNavigation, Footer } from "@/features/landing";
import { ProfileNav } from "@/features/profile/components/ProfileNav";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background text-text-primary">
      <GlobalNavigation />

      <main className="mx-auto max-w-[880px] px-5 py-8 sm:px-6 sm:py-12 md:py-14 pb-36 sm:pb-32 md:pb-20">
        <ProfileNav />
        {children}
      </main>

      <Footer />
    </div>
  );
}
