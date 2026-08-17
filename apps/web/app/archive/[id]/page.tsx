import { Nav, Footer } from "@/features/landing";
import { getArchiveRecordById, getArchiveRecords } from "@/shared/lib/archive-service";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FileText,
  FolderGit2,
  Calendar,
  Tag,
  ArrowLeft,
  Download,
  Shield,
  Clock,
  Layers,
  ExternalLink,
  History,
  CheckCircle2,
} from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const record = await getArchiveRecordById(id);
  return {
    title: `${record?.title || id} — AIIC Institutional Archive`,
    description: record?.description || "AIIC Permanent Institutional Archival Record",
  };
}

export default async function ArchiveRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getArchiveRecordById(id);

  if (!record) {
    notFound();
  }

  const doc = record.document;

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Nav />
      <main className="mx-auto max-w-[1080px] px-5 py-12 sm:px-8 sm:py-16">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-5">
          <Link
            href="/archive"
            className="inline-flex items-center gap-1 font-mono text-xs text-text-muted hover:text-accent transition-colors"
          >
            <ArrowLeft size={13} /> Back to Archive
          </Link>
          <span className="text-border">/</span>
          <span className="font-mono text-xs font-bold text-accent">{record.archiveId}</span>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main Document Details & Versions */}
          <div className="space-y-8">
            <div className="rounded-xl border border-border/80 bg-surface-raised p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="rounded border border-border bg-bg-deep px-2.5 py-1 font-bold text-accent">
                  {record.archiveId}
                </span>
                <span className="rounded border border-border bg-bg-deep px-2 py-1 text-text-muted uppercase">
                  {record.type}
                </span>
                <span className="rounded border border-border bg-bg-deep px-2 py-1 text-text-muted">
                  Session {record.session}
                </span>
              </div>

              <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
                {record.title}
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {record.description}
              </p>

              {/* Document Download & Preview Box */}
              {doc && (
                <div className="mt-6 rounded-xl border border-border/80 bg-bg-deep p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/10 text-info shrink-0">
                        <FileText size={24} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold text-text-primary">
                          {doc.fileName}
                        </p>
                        <p className="font-mono text-xs text-text-muted">
                          {doc.currentVersion} · {(doc.fileSize / 1024).toFixed(0)} KB · {doc.category}
                        </p>
                      </div>
                    </div>

                    <a
                      href={doc.fileUrl}
                      download
                      className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-mono text-xs font-semibold text-on-accent hover:bg-accent-violet-bright transition-colors"
                    >
                      <Download size={14} /> Download Document
                    </a>
                  </div>

                  {doc.sha256 && (
                    <div className="mt-4 pt-3 border-t border-border/50 font-mono text-[11px] text-text-muted break-all">
                      <span className="text-text-faint">SHA-256 Checksum: </span>
                      {doc.sha256}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Document Version History */}
            {doc && doc.versions && doc.versions.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-surface-raised p-6">
                <h3 className="flex items-center gap-2 font-mono text-sm font-bold text-text-primary">
                  <History size={16} className="text-accent" /> Document Version History
                </h3>

                <div className="mt-4 divide-y divide-border/50">
                  {doc.versions.map((ver) => (
                    <div key={ver.version} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-accent">{ver.version}</span>
                          <span className="font-mono text-xs text-text-muted">
                            {new Date(ver.uploadedAt).toLocaleDateString()} by {ver.uploaderName}
                          </span>
                        </div>
                        {ver.changeNote && (
                          <p className="mt-1 text-xs text-text-secondary">{ver.changeNote}</p>
                        )}
                      </div>

                      <a
                        href={ver.fileUrl}
                        download
                        className="font-mono text-xs text-accent hover:underline flex items-center gap-1"
                      >
                        <Download size={11} /> Download {ver.version}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Metadata & Institutional Context */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border/80 bg-surface-raised p-6">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text-muted">
                Archival Metadata
              </h3>

              <div className="mt-4 space-y-4 font-mono text-xs">
                <div>
                  <span className="text-text-faint">Status</span>
                  <p className="mt-0.5 font-bold text-live flex items-center gap-1">
                    <CheckCircle2 size={12} /> {record.status}
                  </p>
                </div>

                <div>
                  <span className="text-text-faint">Date Archived</span>
                  <p className="mt-0.5 text-text-primary">{new Date(record.createdAt).toLocaleDateString()}</p>
                </div>

                <div>
                  <span className="text-text-faint">Academic Session</span>
                  <p className="mt-0.5 text-text-primary">{record.session}</p>
                </div>

                <div>
                  <span className="text-text-faint">Institution</span>
                  <p className="mt-0.5 text-text-primary">Bal Bhawan School (AIIC)</p>
                </div>

                {record.tags.length > 0 && (
                  <div>
                    <span className="text-text-faint">Tags</span>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {record.tags.map((t) => (
                        <span key={t} className="rounded bg-bg-deep border border-border px-1.5 py-0.5 text-[10px] text-text-secondary">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
