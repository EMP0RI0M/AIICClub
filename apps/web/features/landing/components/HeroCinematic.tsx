"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Globe, ArrowRight } from "lucide-react";

export function HeroCinematic() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animFrame: number;

    const fade = (start: number, end: number, duration: number, onComplete?: () => void) => {
      const startTime = performance.now();
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        if (video) {
          video.style.opacity = String(start + (end - start) * progress);
        }
        if (progress < 1) {
          animFrame = requestAnimationFrame(step);
        } else if (onComplete) {
          onComplete();
        }
      };
      animFrame = requestAnimationFrame(step);
    };

    const handleCanPlay = () => {
      video.play().catch(() => {});
      fade(0, 1, 500);
    };

    const handleTimeUpdate = () => {
      if (video.duration && video.duration - video.currentTime <= 0.55) {
        fade(parseFloat(video.style.opacity || "1"), 0, 500);
      }
    };

    const handleEnded = () => {
      video.style.opacity = "0";
      setTimeout(() => {
        if (video) {
          video.currentTime = 0;
          video.play().catch(() => {});
          fade(0, 1, 500);
        }
      }, 100);
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      cancelAnimationFrame(animFrame);
      if (video) {
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("ended", handleEnded);
      }
    };
  }, []);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 4000);
      setEmail("");
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col justify-between overflow-x-hidden bg-black text-white selection:bg-white/20">
      {/* Background Video with responsive object position */}
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        preload="auto"
        style={{ opacity: 0 }}
        className="absolute inset-0 h-full w-full object-cover object-center md:object-bottom pointer-events-none"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4"
      />

      {/* Responsive Gradient Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black pointer-events-none" />

      {/* Hero Central Content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pt-28 pb-12 sm:pt-36 sm:pb-16 text-center sm:px-6 md:pt-40 md:pb-20">
        <span className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/60 sm:mb-3 sm:text-xs">
          Bal Bhawan School · Academic Session 2026–2027
        </span>

        {/* Responsive Heading */}
        <h1 className="font-serif-instrument text-[clamp(2.75rem,11vw,8rem)] leading-[1.05] tracking-tight text-white whitespace-normal max-w-full px-2">
          Know it then <em className="italic font-normal">all</em>.
        </h1>

        {/* Email Input */}
        <form onSubmit={handleSubmit} className="mt-6 w-full max-w-md px-2 sm:mt-8 sm:max-w-xl">
          <div className="liquid-glass flex min-h-[52px] w-full items-center gap-2 rounded-full py-1.5 pl-5 pr-1.5 sm:min-h-[58px] sm:gap-3 sm:py-2 sm:pl-6 sm:pr-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your school email..."
              className="w-full min-w-0 bg-transparent text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Subscribe"
              className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform active:scale-95 sm:hover:scale-105"
            >
              <ArrowRight size={18} />
            </button>
          </div>
          {subscribed && (
            <p className="mt-2 text-xs font-mono text-white/90">
              ✓ Subscribed to AIIC institutional briefings.
            </p>
          )}
        </form>

        {/* Subtitle */}
        <p className="mx-auto mt-5 max-w-md px-3 text-xs leading-relaxed text-white/80 sm:mt-6 sm:text-sm sm:max-w-lg">
          The AI &amp; Innovation Club is an outcome-oriented technical community at Bal Bhawan School
          focused on applied AI, data pipelines, software engineering, and real-world systems.
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex w-full max-w-xs flex-col gap-3 sm:max-w-md sm:flex-row sm:items-center sm:justify-center sm:gap-4 md:mt-8">
          <Link
            href="/about"
            className="liquid-glass flex min-h-[48px] w-full items-center justify-center rounded-full px-6 text-xs font-medium text-white transition-colors hover:bg-white/10 active:scale-[0.98] sm:w-auto sm:text-sm sm:px-8 sm:py-3"
          >
            Read Our Manifesto
          </Link>
          <Link
            href="/archive"
            className="liquid-glass flex min-h-[48px] w-full items-center justify-center rounded-full px-6 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 active:scale-[0.98] sm:w-auto sm:text-sm sm:px-8 sm:py-3"
          >
            Explore Archive
          </Link>
        </div>
      </div>

      {/* Social / Link Icons Footer */}
      <footer className="relative z-10 flex justify-center gap-4 px-4 pb-6 pt-2 sm:pb-12">
        <a
          href="https://github.com/AIIC-Organization"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub Organization"
          className="liquid-glass flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full text-white/80 transition-all hover:bg-white/10 hover:text-white"
        >
          <Globe size={18} />
        </a>
        <a
          href="https://twitter.com"
          target="_blank"
          rel="noreferrer"
          aria-label="Twitter/X"
          className="liquid-glass flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full text-white/80 transition-all hover:bg-white/10 hover:text-white"
        >
          <svg className="h-4 w-4 fill-current sm:h-5 sm:w-5" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram"
          className="liquid-glass flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full text-white/80 transition-all hover:bg-white/10 hover:text-white"
        >
          <svg className="h-4 w-4 fill-none stroke-current stroke-2 sm:h-5 sm:w-5" viewBox="0 0 24 24">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
          </svg>
        </a>
      </footer>
    </div>
  );
}
