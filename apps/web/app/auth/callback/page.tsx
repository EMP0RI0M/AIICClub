"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth-store";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const restoreSession = useAuthStore((state) => state.restoreSession);
    const [error, setError] = useState<string | null>(null);

    const [isMobileDevice, setIsMobileDevice] = useState(false);
    const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);

    useEffect(() => {
        const providerError = searchParams.get("error");
        if (providerError) {
            setError("The authentication provider returned an error. Please try again.");
            return;
        }

        // Check if on mobile or if deep link target is indicated
        const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
        const isMobile = /android|iphone|ipad|ipod/i.test(userAgent);
        setIsMobileDevice(isMobile);

        if (typeof window !== "undefined") {
            const hash = window.location.hash || "";
            const search = window.location.search || "";
            const fullTarget = `aiic://auth/callback${search}${hash}`;
            setDeepLinkUrl(fullTarget);

            // If user came via mobile browser OAuth redirect, attempt to deep link back to native app
            if (isMobile && (hash.includes("access_token") || search.includes("code="))) {
                window.location.href = fullTarget;
            }
        }

        let cancelled = false;

        (async () => {
            try {
                const restored = await restoreSession();
                if (!restored) {
                    throw new Error("No active session was found. Please sign in again.");
                }

                if (!cancelled) {
                    const redirect = searchParams.get("redirect") || "/spaces";
                    router.replace(redirect.startsWith("/") ? redirect : `/${redirect}`);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Unable to finish sign-in.");
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [restoreSession, router, searchParams]);

    return (
        <div className="h-full bg-background flex items-center justify-center px-6 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
                <div className="absolute top-[20%] left-[15%] w-[500px] h-[500px] bg-accent-violet/[0.06] rounded-full blur-[180px] animate-pulse" />
                <div className="absolute bottom-[15%] right-[10%] w-[400px] h-[400px] bg-accent-teal/[0.05] rounded-full blur-[160px] animate-pulse" style={{ animationDelay: "2s" }} />
            </div>

            <div className="w-full max-w-[480px] relative z-10">
                <div className="relative">
                    <div className="absolute -inset-[1px] bg-gradient-to-br from-accent-violet/30 via-border to-accent-teal/20 rounded-2xl" />
                    <div className="relative bg-surface rounded-2xl p-10 text-center">
                        {error ? (
                            <>
                                <div className="flex justify-center mb-6">
                                    <div className="w-20 h-20 rounded-2xl bg-danger/10 flex items-center justify-center border border-danger/20">
                                        <XCircle className="w-9 h-9 text-danger" />
                                    </div>
                                </div>
                                <h1 className="text-heading font-bold text-text-primary mb-2">Sign-in failed</h1>
                                <p className="text-body text-text-muted mb-6">{error}</p>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-accent-violet text-on-accent rounded-[10px] font-medium text-body transition-all duration-200 hover:shadow-[0_0_30px_rgba(232,163,61,0.35)] hover:bg-[#C9862B]"
                                >
                                    Try Again
                                </Link>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-center mb-6">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-violet/20 to-accent-teal/10 flex items-center justify-center border border-border">
                                        <CheckCircle2 className="w-9 h-9 text-accent-violet animate-pulse" />
                                    </div>
                                </div>
                                <h1 className="text-heading font-bold text-text-primary mb-2">Finishing sign-in</h1>
                                <p className="text-body text-text-muted mb-4">We&apos;re finishing your sign-in.</p>
                                {isMobileDevice && deepLinkUrl && (
                                    <a
                                        href={deepLinkUrl}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent-violet text-on-accent rounded-[10px] font-medium text-sm transition-all duration-200 hover:shadow-[0_0_20px_rgba(232,163,61,0.35)] hover:bg-[#C9862B]"
                                    >
                                        Open in AIIC Mobile App
                                    </a>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors group"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                        Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={null}>
            <AuthCallbackContent />
        </Suspense>
    );
}