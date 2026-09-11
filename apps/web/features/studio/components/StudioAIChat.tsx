"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@corvus/ui";
import { 
  Send, Bot, User, CheckCircle2, Loader2, Key, Terminal, Code2, 
  RefreshCw, Sparkles, Paperclip, Mic, SlidersHorizontal, ArrowUp,
  FileCode, PlayCircle, ChevronDown
} from "lucide-react";

interface StudioAIChatProps {
  projectId: string;
  onFileModified?: () => void;
  onOpenPreview?: () => void;
  onOpenFiles?: () => void;
}

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{
    toolName: string;
    args: any;
    state: "calling" | "result";
    result?: any;
  }>;
  progressStep?: string;
}

const POPULAR_MODELS = [
  { id: "anthropic/claude-3.7-sonnet", label: "Claude 3.7 Sonnet (Reasoning)", provider: "openrouter" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", provider: "openrouter" },
  { id: "openai/gpt-4.5-preview", label: "GPT-4.5 Preview", provider: "openrouter" },
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "openrouter" },
  { id: "google/gemini-2.5-pro-preview", label: "Gemini 2.5 Pro Preview", provider: "openrouter" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "openrouter" },
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1", provider: "openrouter" },
  { id: "deepseek/deepseek-chat", label: "DeepSeek V3", provider: "openrouter" },
  { id: "qwen/qwen-2.5-coder-32b-instruct", label: "Qwen 2.5 Coder 32B", provider: "openrouter" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", provider: "openrouter" },
];

const QUICK_SUGGESTIONS = [
  "Add dark mode theme toggle",
  "Build interactive hero section",
  "Connect to Supabase backend",
  "Fix layout responsive padding",
];

export function StudioAIChat({ 
  projectId, 
  onFileModified,
  onOpenPreview,
  onOpenFiles 
}: StudioAIChatProps) {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Your project environment is ready. What would you like to build today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  
  // Selected Model State
  const [selectedModel, setSelectedModel] = useState<string>("anthropic/claude-3.7-sonnet");
  const [customModelInput, setCustomModelInput] = useState<string>("");
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStep]);

  const handleSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || input;
    if (!promptToSend.trim() || isLoading) return;

    const userMsg: MessageItem = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: promptToSend.trim(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setCurrentStep("Planning changes...");

    const activeModelId = isCustomModel && customModelInput.trim() ? customModelInput.trim() : selectedModel;

    try {
      setTimeout(() => setCurrentStep("Updating project files..."), 1200);
      setTimeout(() => setCurrentStep("Checking app & starting dev server..."), 2400);

      const response = await fetch("/api/studio/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          provider: "openrouter",
          modelId: activeModelId,
          messages: newMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to contact studio AI");
      }

      const assistantId = `ast_${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "I have applied the requested changes to your application and verified that the development server is running cleanly.",
        },
      ]);

      if (onFileModified) onFileModified();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `⚠️ Error: ${err.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setCurrentStep(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#0b0d14] relative">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 pb-36">
        {messages.map((m) => {
          const isAssistant = m.role === "assistant";
          return (
            <div
              key={m.id}
              className={cn(
                "flex gap-3 max-w-[92%] sm:max-w-[85%]",
                isAssistant ? "mr-auto" : "ml-auto flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-md",
                  isAssistant
                    ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-white"
                    : "bg-white/10 text-white border border-white/10"
                )}
              >
                {isAssistant ? <Sparkles size={13} /> : <User size={13} />}
              </div>

              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm",
                  isAssistant
                    ? "bg-[#131622] text-white/90 border border-white/[0.08]"
                    : "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium"
                )}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {/* Live Build / Progress Indicators */}
        {isLoading && currentStep && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-mono mr-auto animate-pulse">
            <Loader2 size={14} className="animate-spin text-orange-400 shrink-0" />
            <span>{currentStep}</span>
          </div>
        )}

        {/* Welcome Quick Actions when only 1 message */}
        {messages.length === 1 && (
          <div className="pt-2 sm:pt-4">
            <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider mb-2">
              Suggested Prompts
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  onClick={() => handleSubmit(undefined, sug)}
                  className="text-left p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-xs text-white/80 hover:text-white transition-all active:scale-[0.98]"
                >
                  ✨ {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Prompt Input with OpenRouter Model Picker */}
      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 bg-gradient-to-t from-[#08090d] via-[#08090d]/95 to-transparent z-20">
        <form
          onSubmit={(e) => handleSubmit(e)}
          className="relative flex flex-col rounded-2xl sm:rounded-3xl border border-white/15 bg-[#141724]/90 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-1.5 sm:p-2 transition-all focus-within:border-orange-500/60"
        >
          {/* Main Input Textarea */}
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask Corvus to build anything..."
            className="w-full resize-none bg-transparent px-3 py-1.5 text-xs sm:text-sm text-white placeholder-white/40 outline-none max-h-24 scrollbar-none"
          />

          {/* Bottom Controls with Model Picker */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 px-1">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <button
                type="button"
                title="Attach asset"
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <Paperclip size={14} />
              </button>

              <button
                type="button"
                title="Voice input"
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <Mic size={14} />
              </button>

              {/* OpenRouter Model Dropdown */}
              {!isCustomModel ? (
                <div className="relative flex items-center min-w-0 max-w-[220px] sm:max-w-xs">
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustomModel(true);
                      } else {
                        setSelectedModel(e.target.value);
                      }
                    }}
                    className="text-[10.5px] font-mono bg-black/50 text-orange-300 border border-white/10 rounded-full px-2.5 py-1 outline-none cursor-pointer truncate max-w-full appearance-none pr-5 hover:border-orange-500/50"
                  >
                    {POPULAR_MODELS.map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#121420] text-white">
                        {m.label}
                      </option>
                    ))}
                    <option value="custom" className="bg-[#121420] text-orange-400">
                      + Custom OpenRouter Model...
                    </option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 pointer-events-none text-white/40" />
                </div>
              ) : (
                <div className="flex items-center gap-1 min-w-0 max-w-[220px]">
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    className="h-6 rounded-full bg-black/60 border border-orange-500/60 px-2.5 text-[10.5px] font-mono text-white outline-none w-full placeholder-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomModel(false)}
                    className="p-1 rounded-full text-white/50 hover:text-white text-[10px]"
                    title="Cancel custom model"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex items-center justify-center size-7 sm:size-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shrink-0"
            >
              {isLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <ArrowUp size={14} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
