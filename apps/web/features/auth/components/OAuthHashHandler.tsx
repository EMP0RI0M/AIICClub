"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/store/auth-store";

export function OAuthHashHandler() {
  const router = useRouter();
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const [showModal, setShowModal] = useState(false);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    const search = window.location.search;

    if (!hash && !search) return;

    // Detect if this URL contains OAuth token fragments (access_token or code)
    const hasOAuthTokens =
      (hash && hash.includes("access_token")) ||
      (search && search.includes("code="));

    if (!hasOAuthTokens) return;

    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isMobile = /android|iphone|ipad|ipod/i.test(userAgent);
    const fullTarget = `aiic://auth/callback${search}${hash}`;
    setDeepLinkUrl(fullTarget);

    if (isMobile) {
      setShowModal(true);
      // Attempt immediate bounce to mobile app
      window.location.href = fullTarget;
    } else {
      // On desktop, restore the session into web app
      restoreSession().then((restored) => {
        if (restored) {
          router.replace("/spaces");
        }
      });
    }
  }, [restoreSession, router]);

  if (!showModal || !deepLinkUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#12131A] border border-[#2A2B36] p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-accent-violet/20 flex items-center justify-center mx-auto mb-4 border border-accent-violet/30">
          <img src="/corvus-logo.png" alt="AIIC" className="w-8 h-8 rounded-full" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Sign-in Complete</h3>
        <p className="text-sm text-[#8F90A6] mb-6">
          Tap below to open your AIIC Club mobile app and access your account.
        </p>
        <a
          href={deepLinkUrl}
          className="block w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-xl transition shadow-lg shadow-amber-500/20 text-center"
        >
          Open in AIIC Mobile App
        </a>
      </div>
    </div>
  );
}
