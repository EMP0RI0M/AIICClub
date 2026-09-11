"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Bot,
  X,
  Check,
  Loader2,
  Clock,
  Layers,
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  ChevronRight,
  Shield,
  HelpCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import type { AIICArchiveRecord } from "@/shared/lib/archive-types";

interface SourceOption {
  id: string;
  title: string;
  category: string;
  session: string;
}

const DEFAULT_SOURCES: SourceOption[] = [
  { id: "AIIC-2026-000015", title: "AIIC Beginner Guide: Antigravity First, CLI & Linux", category: "Official Study Notes", session: "2026–27" },
  { id: "AIIC-2026-000013", title: "Lecture 4 Revision: Live Website Setup & System Architecture", category: "Official Study Notes", session: "2026–27" },
  { id: "AIIC-2026-000012", title: "AIIC Hackathon: Full-Stack React & Next.js Guide", category: "Official Study Notes", session: "2026–27" },
  { id: "AIIC-2026-000005", title: "Lecture 1 Study Notes: Website Basics & Three-Tier Architecture", category: "Official Study Notes", session: "2026–27" },
  { id: "AIIC-2026-000007", title: "Lecture 2 Study Notes: AI Applications & RAG Systems", category: "Official Study Notes", session: "2026–27" },
  { id: "AIIC-2026-000001", title: "Lecture 3 Study Notes: Autonomous AI Agents & Tool Use", category: "Official Study Notes", session: "2026–27" },
  { id: "AIIC-2026-000003", title: "Lecture 4 Study Notes: Production Deployment & Docker", category: "Official Study Notes", session: "2026–27" },
  { id: "AIIC-2026-000002", title: "AIIC Official Prospectus & Student Constitution", category: "Institutional Governance", session: "2026–27" },
];

interface GeneratedQuestion {
  id: string;
  questionOrder: number;
  questionText: string;
  options: string[];
  correctOption: string;
  correctOptionIndex: number;
  explanation: string;
  sourceId: string;
  sourceExcerpt?: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  timeLimitSeconds: number;
}

interface GeneratedQuizDraft {
  title: string;
  slug: string;
  shortTitle: string;
  description: string;
  category: string;
  session: string;
  durationMinutes: number;
  durationSeconds: number;
  badgeName: string;
  sources: Array<{ sourceId: string; title: string; category: string }>;
  questions: GeneratedQuestion[];
}

interface AdminQuizCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizPublished?: (slug: string) => void;
  initialSourceIds?: string[];
}

export function AdminQuizCreatorModal({
  isOpen,
  onClose,
  onQuizPublished,
  initialSourceIds = [],
}: AdminQuizCreatorModalProps) {
  const [sourcesList, setSourcesList] = useState<SourceOption[]>(DEFAULT_SOURCES);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(
    initialSourceIds.length > 0 ? initialSourceIds : ["AIIC-2026-000012", "AIIC-2026-000013"]
  );
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(3);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("medium");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [category, setCategory] = useState<string>("Official Study Assessment");
  const [searchSourceQuery, setSearchSourceQuery] = useState<string>("");

  // Stepper state
  const [step, setStep] = useState<"configure" | "preview" | "published">("configure");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Generated draft quiz
  const [quizDraft, setQuizDraft] = useState<GeneratedQuizDraft | null>(null);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);

  // Published result
  const [publishedInfo, setPublishedInfo] = useState<{
    quizId: string;
    slug: string;
    title: string;
    url: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch live archive records to populate source options
  useEffect(() => {
    async function loadArchiveSources() {
      try {
        const res = await fetch("/api/archive/records");
        const data = await res.json();
        if (data.records && Array.isArray(data.records)) {
          const mapped: SourceOption[] = data.records.map((r: any) => ({
            id: r.archiveId || r.id,
            title: r.title,
            category: r.category || r.document?.category || "Official Study Notes",
            session: r.session || "2026–27",
          }));
          if (mapped.length > 0) {
            setSourcesList(mapped);
          }
        }
      } catch {
        // Fallback to default sources
      }
    }
    if (isOpen) {
      loadArchiveSources();
    }
  }, [isOpen]);

  // Sync initialSourceIds when changed
  useEffect(() => {
    if (initialSourceIds.length > 0) {
      setSelectedSourceIds(initialSourceIds);
    }
  }, [initialSourceIds]);

  if (!isOpen) return null;

  const toggleSourceSelection = (sourceId: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]
    );
  };

  const handleGenerateQuiz = async () => {
    if (selectedSourceIds.length === 0) {
      setGenError("Please select at least one archive source.");
      return;
    }

    setGenError(null);
    setIsGenerating(true);

    try {
      const res = await fetch("/api/admin/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceIds: selectedSourceIds,
          questionCount,
          timeLimitMinutes,
          difficulty,
          title: customTitle,
          customPrompt,
          category,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate AI quiz from sources.");
      }

      setQuizDraft(data.quiz);
      setStep("preview");
    } catch (err: any) {
      console.error("[GEN_QUIZ_ERROR]", err);
      setGenError(err?.message || "Failed to generate quiz with AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!quizDraft || quizDraft.questions.length === 0) return;

    setIsSaving(true);
    setGenError(null);

    try {
      const res = await fetch("/api/admin/quiz/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz: quizDraft,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save and publish quiz.");
      }

      setPublishedInfo({
        quizId: data.quizId,
        slug: data.slug,
        title: data.title,
        url: `${window.location.origin}/quiz?quiz=${data.slug}`,
      });
      setStep("published");
      if (onQuizPublished) {
        onQuizPublished(data.slug);
      }
    } catch (err: any) {
      console.error("[SAVE_QUIZ_ERROR]", err);
      setGenError(err?.message || "Failed to save quiz to database.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (publishedInfo?.url) {
      navigator.clipboard.writeText(publishedInfo.url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const updateQuestionText = (index: number, newText: string) => {
    if (!quizDraft) return;
    const updated = [...quizDraft.questions];
    updated[index].questionText = newText;
    setQuizDraft({ ...quizDraft, questions: updated });
  };

  const updateOptionText = (qIndex: number, optIndex: number, newText: string) => {
    if (!quizDraft) return;
    const updated = [...quizDraft.questions];
    const prevOption = updated[qIndex].options[optIndex];
    const isCorrect = updated[qIndex].correctOption === prevOption;

    updated[qIndex].options[optIndex] = newText;
    if (isCorrect) {
      updated[qIndex].correctOption = newText;
    }
    setQuizDraft({ ...quizDraft, questions: updated });
  };

  const setCorrectOption = (qIndex: number, optIndex: number) => {
    if (!quizDraft) return;
    const updated = [...quizDraft.questions];
    const targetOpt = updated[qIndex].options[optIndex];
    updated[qIndex].correctOption = targetOpt;
    updated[qIndex].correctOptionIndex = optIndex;
    setQuizDraft({ ...quizDraft, questions: updated });
  };

  const updateExplanation = (index: number, newExpl: string) => {
    if (!quizDraft) return;
    const updated = [...quizDraft.questions];
    updated[index].explanation = newExpl;
    setQuizDraft({ ...quizDraft, questions: updated });
  };

  const deleteQuestion = (index: number) => {
    if (!quizDraft) return;
    const updated = quizDraft.questions.filter((_, idx) => idx !== index);
    setQuizDraft({ ...quizDraft, questions: updated });
  };

  const filteredSources = sourcesList.filter(
    (s) =>
      s.title.toLowerCase().includes(searchSourceQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchSourceQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchSourceQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-[92vh] max-h-[900px] flex flex-col rounded-3xl border border-amber-500/30 bg-[#09090b] shadow-[0_0_60px_rgba(245,158,11,0.15)] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center shadow-md shadow-amber-400/10">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  AIIC Quiz Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono text-[10px] font-bold">
                  President &amp; Admin
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Generate and permanently publish assessments grounded in specific archive sources.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="px-6 py-3 border-b border-white/5 bg-zinc-950/40 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center justify-center size-5 rounded-full text-[11px] font-bold ${
                step === "configure"
                  ? "bg-amber-400 text-black"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              1
            </span>
            <span className={step === "configure" ? "text-white font-semibold" : "text-zinc-400"}>
              Configure &amp; Select Sources
            </span>
          </div>

          <ChevronRight size={14} className="text-zinc-600" />

          <div className="flex items-center gap-2">
            <span
              className={`flex items-center justify-center size-5 rounded-full text-[11px] font-bold ${
                step === "preview"
                  ? "bg-amber-400 text-black"
                  : step === "published"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-zinc-500"
              }`}
            >
              2
            </span>
            <span className={step === "preview" ? "text-white font-semibold" : "text-zinc-500"}>
              Review &amp; Refine Questions
            </span>
          </div>

          <ChevronRight size={14} className="text-zinc-600" />

          <div className="flex items-center gap-2">
            <span
              className={`flex items-center justify-center size-5 rounded-full text-[11px] font-bold ${
                step === "published" ? "bg-amber-400 text-black" : "bg-white/5 text-zinc-500"
              }`}
            >
              3
            </span>
            <span className={step === "published" ? "text-white font-semibold" : "text-zinc-500"}>
              Published to Students
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {genError && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs font-mono flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                <span>{genError}</span>
              </div>
              <button
                onClick={() => setGenError(null)}
                className="text-zinc-400 hover:text-white text-[11px] underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* STEP 1: CONFIGURE & SELECT SOURCES */}
          {step === "configure" && (
            <div className="space-y-6">
              {/* Sources Multi-Selection */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-sm font-bold text-white flex items-center gap-1.5">
                      <BookOpen size={15} className="text-amber-400" />
                      <span>Select Target Archive Sources ({selectedSourceIds.length} selected)</span>
                    </label>
                    <p className="text-xs text-zinc-400">
                      AI will strictly formulate questions exclusively from the extracted full-text notes of chosen sources.
                    </p>
                  </div>
                  <input
                    type="text"
                    placeholder="Search sources..."
                    value={searchSourceQuery}
                    onChange={(e) => setSearchSourceQuery(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 font-mono w-44"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                  {filteredSources.map((s) => {
                    const isSelected = selectedSourceIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleSourceSelection(s.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 select-none ${
                          isSelected
                            ? "bg-amber-400/10 border-amber-400/50 shadow-sm"
                            : "bg-black/40 border-white/10 hover:border-white/20 hover:bg-black/60"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-amber-300">
                              {s.id}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              • {s.category}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-white truncate">{s.title}</h4>
                        </div>
                        <div
                          className={`size-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected
                              ? "bg-amber-400 border-amber-400 text-black"
                              : "border-white/20 bg-zinc-900"
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quiz Parameters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/5">
                {/* Number of Questions */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-zinc-400 font-semibold flex items-center gap-1">
                    <Layers size={13} className="text-amber-400" />
                    <span>Question Count</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[3, 5, 8, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuestionCount(num)}
                        className={`py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                          questionCount === num
                            ? "bg-amber-400 text-black shadow-sm"
                            : "bg-black/60 border border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {num} Qs
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Limit */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-zinc-400 font-semibold flex items-center gap-1">
                    <Clock size={13} className="text-amber-400" />
                    <span>Time Limit (Minutes)</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[2, 3, 5, 10].map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setTimeLimitMinutes(min)}
                        className={`py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                          timeLimitMinutes === min
                            ? "bg-amber-400 text-black shadow-sm"
                            : "bg-black/60 border border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {min}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-zinc-400 font-semibold flex items-center gap-1">
                    <Shield size={13} className="text-amber-400" />
                    <span>Difficulty</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["easy", "medium", "hard"] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficulty(diff)}
                        className={`py-2 rounded-xl font-mono text-xs font-bold capitalize transition-all cursor-pointer ${
                          difficulty === diff
                            ? "bg-amber-400 text-black shadow-sm"
                            : "bg-black/60 border border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional Custom Instructions & Title */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-400 font-semibold">
                    Custom Quiz Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. AIIC Mid-Term Exam: React Architecture & RAG Systems"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-400 font-semibold">
                    Instructor Prompt / Specific Focus (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g. Focus on code snippets, command line flags, and architectural trade-offs between client and server components."
                    className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & REFINE QUESTIONS */}
          {step === "preview" && quizDraft && (
            <div className="space-y-6">
              {/* Quiz Header Overview */}
              <div className="p-4 rounded-2xl bg-amber-400/5 border border-amber-400/20 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-base font-bold text-white">{quizDraft.title}</h3>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/30">
                      {quizDraft.questions.length} Questions
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-white/5 text-zinc-300 border border-white/10">
                      {quizDraft.durationMinutes} Min
                    </span>
                  </div>
                </div>
                <p className="text-xs text-zinc-400">{quizDraft.description}</p>
                <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-zinc-500">
                  <span>Sources Grounded:</span>
                  {quizDraft.sources.map((s) => (
                    <span
                      key={s.sourceId}
                      className="px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-amber-300 font-bold"
                    >
                      {s.sourceId}
                    </span>
                  ))}
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <HelpCircle size={15} className="text-amber-400" />
                    <span>Generated Questions (Review &amp; Edit)</span>
                  </h4>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Click any radio button to change the correct answer
                  </span>
                </div>

                {quizDraft.questions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="p-5 rounded-2xl bg-zinc-950 border border-white/10 space-y-4 shadow-md group hover:border-amber-400/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="size-6 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {qIdx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 font-mono text-[10px] text-zinc-400">
                          Source: {q.sourceId}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteQuestion(qIdx)}
                        className="text-zinc-600 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                        title="Delete Question"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Question Statement */}
                    <div>
                      <label className="text-[11px] font-mono text-zinc-500 font-semibold mb-1 block">
                        Question Statement:
                      </label>
                      <textarea
                        rows={2}
                        value={q.questionText}
                        onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 leading-relaxed resize-none"
                      />
                    </div>

                    {/* Options (4 items) */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono text-zinc-500 font-semibold block">
                        Answer Options (Select correct answer):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctOption === opt;
                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                                isCorrect
                                  ? "bg-emerald-500/10 border-emerald-500/50 text-white"
                                  : "bg-black/40 border-white/10 text-zinc-300"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setCorrectOption(qIdx, optIdx)}
                                className={`size-4 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${
                                  isCorrect
                                    ? "border-emerald-400 bg-emerald-400"
                                    : "border-white/30 bg-transparent hover:border-amber-400"
                                }`}
                              >
                                {isCorrect && <div className="size-1.5 rounded-full bg-black" />}
                              </button>

                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                                className="w-full bg-transparent text-xs text-white focus:outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="pt-2 border-t border-white/5">
                      <label className="text-[11px] font-mono text-zinc-500 font-semibold mb-1 block">
                        Pedagogical Explanation:
                      </label>
                      <textarea
                        rows={2}
                        value={q.explanation}
                        onChange={(e) => updateExplanation(qIdx, e.target.value)}
                        className="w-full p-2 rounded-xl bg-black/40 border border-white/5 text-xs text-zinc-300 focus:outline-none focus:border-amber-400 leading-relaxed resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: PUBLISHED SUCCESS */}
          {step === "published" && publishedInfo && (
            <div className="py-8 text-center space-y-6 max-w-lg mx-auto">
              <div className="size-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 animate-in zoom-in">
                <CheckCircle2 size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Quiz Published Successfully!</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  The quiz has been saved permanently to the database. Students can now take this
                  exam directly from the Quiz Catalog or via the direct link below.
                </p>
              </div>

              {/* Shareable Box */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 text-left">
                <div className="text-[11px] font-mono text-zinc-500">Official Share Link:</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publishedInfo.url}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 font-mono text-xs text-amber-300 select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                  >
                    {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedLink ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 font-mono text-xs font-semibold cursor-pointer"
                >
                  Close Studio
                </button>
                <a
                  href={`/quiz?quiz=${publishedInfo.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer"
                >
                  <Play size={13} className="fill-black" />
                  <span>Launch Student Quiz</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer Actions */}
        <div className="p-5 border-t border-white/10 bg-black/80 flex items-center justify-between shrink-0">
          {step === "configure" && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white font-mono text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateQuiz}
                disabled={isGenerating || selectedSourceIds.length === 0}
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-amber-400/20 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-black" />
                    <span>Extracting Sources &amp; Formulating Questions...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Generate Quiz with AI ({selectedSourceIds.length} sources)</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === "preview" && (
            <>
              <button
                type="button"
                onClick={() => setStep("configure")}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Back to Configuration</span>
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGenerateQuiz}
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 font-mono text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuiz}
                  disabled={isSaving || !quizDraft || quizDraft.questions.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-amber-400/20 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-black" />
                      <span>Publishing to Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Save &amp; Publish Quiz</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === "published" && (
            <div className="w-full flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setStep("configure");
                  setQuizDraft(null);
                  setPublishedInfo(null);
                }}
                className="px-4 py-2 rounded-xl text-amber-400 hover:underline font-mono text-xs cursor-pointer"
              >
                + Create Another Quiz
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
