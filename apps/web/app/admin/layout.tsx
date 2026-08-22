"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@corvus/ui";
import {
  Menu,
  X,
  Shield,
  ArrowLeft,
  LayoutDashboard,
  UserCheck,
  Users,
  ShieldAlert,
  FolderKanban,
  Layers,
  FileText,
  Crown,
  FolderGit2,
  Lock,
  Loader2,
} from "lucide-react";
import { api } from "@/shared/lib/api";

const ADMIN_NAV = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Approval Queue", href: "/admin/approvals", icon: UserCheck },
  { label: "People & Users", href: "/admin/users", icon: Users },
  { label: "Roles & Governance", href: "/admin/roles", icon: ShieldAlert },
  { label: "Spaces Oversight", href: "/admin/spaces", icon: FolderKanban },
  { label: "Teams & Pools", href: "/admin/teams", icon: Layers },
  { label: "GitHub & Automation", href: "/admin/github", icon: FolderGit2 },
  { label: "Audit Logs", href: "/admin/audit", icon: FileText },
  { label: "Leadership & Succession", href: "/admin/leadership", icon: Crown },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Authorize user against the Admin API
  useEffect(() => {
    let cancelled = false;
    api<any>("/admin/overview")
      .then((data) => {
        if (!cancelled) {
          setAuthorized(true);
          setAdminUser(data.adminUser);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setAuthorized(false);
          setErrorMessage(err.message || "Access Denied: Admin Board is strictly reserved for President and Admin roles.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);


  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0c0f17] text-text-secondary">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-accent" />
          <span className="font-mono text-xs tracking-wider uppercase text-text-muted">
            Verifying Governance Credentials...
          </span>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0c0f17] p-6 text-center">
        <div className="max-w-md rounded-3xl border border-danger/20 bg-[#121622] p-8 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 border border-danger/20 text-danger shadow-inner">
            <Lock size={24} />
          </div>
          <h1 className="text-xl font-bold text-text-primary">Admin Access Restricted</h1>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">
            {errorMessage ||
              "Only active President and Admin accounts have organization governance authority."}
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/spaces"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-xs font-semibold text-text-primary hover:bg-white/15 transition-all"
            >
              <ArrowLeft size={14} />
              Return to Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentNav = ADMIN_NAV.find((item) => item.href === pathname) || ADMIN_NAV[0];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0c0f17] text-text-primary">
      {/* ─── Desktop Sidebar (md+) ─── */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/[0.08] bg-[#10141f]/80 backdrop-blur-xl">
        {/* Header Branding */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 border border-accent/30 text-accent shadow-inner">
              <Shield size={16} />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                AIIC Board
              </div>
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                Governance Control Plane
              </span>
            </div>
          </div>
        </div>

        {/* Current Admin User Badge */}
        {adminUser && (
          <div className="px-4 py-3 mx-3 my-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-primary truncate">
                {adminUser.displayName}
              </span>
              <span className="px-2 py-0.5 rounded-md font-mono text-[9px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/25">
                {adminUser.roleKey.replace("_", " ")}
              </span>
            </div>
            <span className="block font-mono text-[10px] text-text-muted mt-0.5">
              Rank {adminUser.hierarchyLevel}
            </span>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all group",
                  isActive
                    ? "bg-accent/15 text-accent font-semibold border border-accent/30 shadow-sm"
                    : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary"
                )}
              >
                <Icon
                  size={16}
                  className={cn(
                    "transition-colors",
                    isActive ? "text-accent" : "text-text-muted group-hover:text-text-primary"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Back to Hub */}
        <div className="p-3 border-t border-white/[0.06]">
          <Link
            href="/spaces"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs font-medium text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-all"
          >
            <ArrowLeft size={14} />
            <span>Return to Workspace</span>
          </Link>
        </div>
      </aside>

      {/* ─── Main Content Container ─── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Mobile Header (md:hidden) */}
        <header className="flex h-14 w-full shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#10141f] px-4 md:hidden z-30">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-text-primary hover:bg-white/[0.06]"
            >
              <Menu size={18} />
            </button>
            <span className="text-sm font-bold text-text-primary">AIIC Admin Board</span>
          </div>

          <Link
            href="/spaces"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 text-[11px] font-medium text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={12} />
            <span>Hub</span>
          </Link>
        </header>

        {/* Mobile Drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
              onClick={() => setDrawerOpen(false)}
            />
            <nav className="relative z-50 flex h-full w-[280px] max-w-[85vw] flex-col border-r border-white/[0.08] bg-[#121622] p-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-accent" />
                  <span className="text-sm font-bold text-text-primary">AIIC Board</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-text-primary"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-1 flex-1 overflow-y-auto">
                {ADMIN_NAV.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium",
                        isActive
                          ? "bg-accent/15 text-accent font-semibold border border-accent/25"
                          : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary"
                      )}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        )}

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
