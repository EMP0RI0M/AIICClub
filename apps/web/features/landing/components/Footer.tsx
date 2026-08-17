"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-black px-5 py-12 sm:px-8 sm:py-16 text-white">
      <div className="mx-auto grid max-w-[1280px] gap-8 md:gap-12 md:grid-cols-[1.5fr_2fr]">
        {/* Brand Description */}
        <div>
          <Link href="/" className="flex items-center gap-3">
            <img src="/corvus-logo-small.png" alt="AIIC" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-white/20" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">AIIC</span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
                AI &amp; Innovation Club
              </span>
            </div>
          </Link>
          <p className="mt-3 max-w-[36ch] text-xs sm:text-[13px] leading-relaxed text-white/70">
            The official student club and research community for artificial intelligence,
            software engineering, hardware innovation, and collaborative building at Bal Bhawan School.
          </p>
          <p className="mt-4 font-mono text-[10px] sm:text-[11px] text-white/40">
            © {new Date().getFullYear()} AIIC. All rights reserved.
          </p>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8">
          <div>
            <h4 className="font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white/90">
              Organization
            </h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/about" className="text-white/60 transition-colors hover:text-white">
                  About AIIC
                </Link>
              </li>
              <li>
                <Link href="/people" className="text-white/60 transition-colors hover:text-white">
                  People &amp; Leads
                </Link>
              </li>
              <li>
                <Link href="/archive" className="text-white/60 transition-colors hover:text-white">
                  Club Archive
                </Link>
              </li>
              <li>
                <Link href="/achievements" className="text-white/60 transition-colors hover:text-white">
                  Achievements
                </Link>
              </li>
              <li>
                <Link href="/notifications" className="text-white/60 transition-colors hover:text-white">
                  Notifications &amp; Bulletins
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white/90">
              Showcase
            </h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/events" className="text-white/60 transition-colors hover:text-white">
                  Workshops &amp; Talks
                </Link>
              </li>
              <li>
                <Link href="/archive" className="text-white/60 transition-colors hover:text-white">
                  Research Papers
                </Link>
              </li>
              <li>
                <Link href="/archive" className="text-white/60 transition-colors hover:text-white">
                  Resources &amp; Notes
                </Link>
              </li>
              <li>
                <Link href="/archive" className="text-white/60 transition-colors hover:text-white">
                  Open Repositories
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <h4 className="font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white/90">
              Platform
            </h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/spaces" className="text-white/60 transition-colors hover:text-white">
                  Member Hub
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-white/60 transition-colors hover:text-white">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="text-white/60 transition-colors hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="text-white/60 transition-colors hover:text-white">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
