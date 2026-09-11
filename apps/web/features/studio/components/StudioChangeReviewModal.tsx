"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { GitPullRequest, Check, X, CheckCheck, XCircle, FileCode, AlertTriangle } from "lucide-react";

export interface FileChangeItem {
  id: string;
  path: string;
  operation: "create" | "update" | "delete";
  before_content?: string;
  after_content?: string;
  status: "pending" | "applied" | "rejected";
}

export interface ChangeSetDetail {
  id: string;
  title: string;
  description?: string;
  studio_file_changes: FileChangeItem[];
}

interface StudioChangeReviewModalProps {
  changeSet: ChangeSetDetail;
  onClose: () => void;
  onApply: (changeIds?: string[]) => Promise<void>;
  onReject: () => Promise<void>;
}

export function StudioChangeReviewModal({
  changeSet,
  onClose,
  onApply,
  onReject,
}: StudioChangeReviewModalProps) {
  const [selectedChangeId, setSelectedChangeId] = useState<string>(
    changeSet.studio_file_changes[0]?.id || ""
  );
  const [submitting, setSubmitting] = useState(false);

  const activeChange = changeSet.studio_file_changes.find((c) => c.id === selectedChangeId);

  const handleApplySingle = async (changeId: string) => {
    setSubmitting(true);
    try {
      await onApply([changeId]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyAll = async () => {
    setSubmitting(true);
    try {
      await onApply();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectAll = async () => {
    setSubmitting(true);
    try {
      await onReject();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
      <div className="flex h-[80vh] w-full max-w-5xl flex-col rounded-xl border border-white/10 bg-[#0d1017] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#090b0f] px-4">
          <div className="flex items-center gap-2">
            <GitPullRequest size={16} className="text-accent" />
            <span className="font-mono text-xs font-semibold text-white">
              {changeSet.title}
            </span>
            <span className="rounded bg-accent/15 px-2 py-0.5 font-mono text-[10px] text-accent">
              {changeSet.studio_file_changes.length} files changed
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={handleApplyAll}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1 font-mono text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
            >
              <CheckCheck size={13} />
              <span>Apply All</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleRejectAll}
              className="flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1 font-mono text-xs font-semibold text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 disabled:opacity-50"
            >
              <XCircle size={13} />
              <span>Reject All</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-text-muted hover:text-white rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body: Left File List | Right Diff Viewer */}
        <div className="flex flex-1 min-h-0">
          {/* Left Column: File Changes List */}
          <div className="w-72 shrink-0 border-r border-white/[0.08] overflow-y-auto p-2 space-y-1">
            {changeSet.studio_file_changes.map((ch) => {
              const isSelected = ch.id === selectedChangeId;
              const opColor =
                ch.operation === "create"
                  ? "text-emerald-400 bg-emerald-500/10"
                  : ch.operation === "delete"
                  ? "text-rose-400 bg-rose-500/10"
                  : "text-sky-400 bg-sky-500/10";

              return (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChangeId(ch.id)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded cursor-pointer font-mono text-xs transition-colors",
                    isSelected ? "bg-accent/15 text-white" : "text-text-muted hover:bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={cn("px-1 py-0.2 text-[9px] uppercase font-bold rounded", opColor)}>
                      {ch.operation[0]}
                    </span>
                    <span className="truncate">{ch.path}</span>
                  </div>

                  {ch.status === "applied" && <Check size={12} className="text-emerald-400" />}
                  {ch.status === "rejected" && <X size={12} className="text-rose-400" />}
                </div>
              );
            })}
          </div>

          {/* Right Column: Side-by-Side Diff View */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#07090e]">
            {activeChange ? (
              <div className="flex flex-1 flex-col min-h-0">
                <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/[0.08] px-3 bg-[#0c0e14]">
                  <span className="font-mono text-xs text-text-primary">
                    {activeChange.path} ({activeChange.operation})
                  </span>
                  {activeChange.status === "pending" && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleApplySingle(activeChange.id)}
                      className="flex items-center gap-1 text-accent font-mono text-xs hover:underline"
                    >
                      <Check size={12} /> Apply File Only
                    </button>
                  )}
                </div>

                <div className="flex-1 grid grid-cols-2 min-h-0 overflow-y-auto font-mono text-xs">
                  {/* Before */}
                  <div className="border-r border-white/[0.08] p-3 overflow-x-auto bg-[#0a0c10]">
                    <div className="text-[10px] text-text-muted/60 uppercase font-bold mb-2">Original</div>
                    <pre className="text-rose-300/80 leading-relaxed whitespace-pre-wrap">
                      {activeChange.before_content || "/* Empty File */"}
                    </pre>
                  </div>
                  {/* After */}
                  <div className="p-3 overflow-x-auto bg-[#0d1017]">
                    <div className="text-[10px] text-text-muted/60 uppercase font-bold mb-2">Proposed Change</div>
                    <pre className="text-emerald-300/90 leading-relaxed whitespace-pre-wrap">
                      {activeChange.after_content || "/* File Deleted */"}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center font-mono text-xs text-text-muted">
                Select a file to inspect diff
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
