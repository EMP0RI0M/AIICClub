"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { RotateCcw, ArrowLeft, ShieldAlert } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class QuizErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[QUIZ_ERROR_BOUNDARY_CAUGHT]", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = "/quiz";
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-xl mx-auto p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-rose-500/30 shadow-2xl space-y-6 text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-lg shadow-rose-500/10">
            <ShieldAlert size={32} />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-white font-mono">
              {this.props.fallbackTitle || "Quiz Display Issue Intercepted"}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-md mx-auto">
              {this.props.fallbackMessage ||
                "Your exam attempt data has been safely recorded. A temporary rendering anomaly occurred, but no attempt progress was lost."}
            </p>
          </div>

          {this.state.error && (
            <div className="p-3 rounded-xl bg-black/60 border border-white/10 text-left font-mono text-[11px] text-zinc-400 overflow-x-auto max-h-28">
              <span className="text-rose-400 font-bold block mb-1">Diagnostic Log:</span>
              <code>{this.state.error.message || String(this.state.error)}</code>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Reload Quiz View</span>
            </button>

            <a
              href="/quiz"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Lecture Catalog</span>
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
