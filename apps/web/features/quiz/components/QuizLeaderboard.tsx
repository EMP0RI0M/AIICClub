"use client";

import React, { useState, useEffect } from "react";
import {
  Trophy,
  Medal,
  Flame,
  Award,
  Clock,
  CheckCircle2,
  Filter,
  Search,
  RefreshCw,
  Sparkles,
  User,
  Shield,
  Layers,
  Zap,
  Play,
  Loader2,
} from "lucide-react";
import { LECTURE_QUIZZES, type LeaderboardEntry } from "@/shared/lib/quiz/quiz-data";

interface QuizLeaderboardProps {
  initialEntries?: LeaderboardEntry[];
  selectedLectureId?: string;
  onSelectLecture?: (lectureId: string) => void;
  onStartQuiz?: () => void;
}

export function QuizLeaderboard({
  initialEntries = [],
  selectedLectureId = "all",
  onSelectLecture,
  onStartQuiz,
}: QuizLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);
  const [activeLecture, setActiveLecture] = useState(selectedLectureId);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchLeaderboard = async (lectureId: string) => {
    setIsLoading(true);
    try {
      const url = lectureId === "all" ? "/api/quiz/leaderboard" : `/api/quiz/leaderboard?lectureId=${lectureId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.leaderboard)) {
        setEntries(data.leaderboard);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(activeLecture);
  }, []);

  const handleFilterChange = (lectureId: string) => {
    setActiveLecture(lectureId);
    if (onSelectLecture) onSelectLecture(lectureId);
    fetchLeaderboard(lectureId);
  };

  const filteredEntries = entries.filter((e) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (e.userName && e.userName.toLowerCase().includes(q)) ||
      (e.userHandle && e.userHandle.toLowerCase().includes(q)) ||
      (e.bestLectureTitle && e.bestLectureTitle.toLowerCase().includes(q))
    );
  });

  const topThree = filteredEntries.slice(0, 3);

  return (
    <div className="w-full space-y-6">
      {/* ── Header & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-400 shrink-0" />
            <h3 className="text-sm sm:text-lg font-bold text-white tracking-tight">
              AIIC Institutional Leaderboard
            </h3>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
            Strictly server-verified member quiz scores, accuracy benchmarks, and fastest runtimes.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-auto min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member or handle..."
            className="w-full pl-9 pr-3 py-2 sm:py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 font-sans min-h-[44px] sm:min-h-[36px]"
          />
        </div>
      </div>

      {/* ── Lecture Filter Tabs (Mobile Thumb-Friendly) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-mono scrollbar-none -mx-1 px-1">
        <button
          onClick={() => handleFilterChange("all")}
          className={`px-3.5 py-2 sm:py-1.5 rounded-xl border whitespace-nowrap transition-all min-h-[40px] flex items-center cursor-pointer ${
            activeLecture === "all"
              ? "bg-amber-400 text-black font-bold border-amber-400 shadow-md shadow-amber-400/20"
              : "bg-zinc-950/60 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          🏆 All Lectures
        </button>

        {LECTURE_QUIZZES.map((quiz) => (
          <button
            key={quiz.id}
            onClick={() => handleFilterChange(quiz.id)}
            className={`px-3.5 py-2 sm:py-1.5 rounded-xl border whitespace-nowrap transition-all min-h-[40px] flex items-center cursor-pointer ${
              activeLecture === quiz.id
                ? "bg-amber-400 text-black font-bold border-amber-400 shadow-md shadow-amber-400/20"
                : "bg-zinc-950/60 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            {quiz.shortTitle}
          </button>
        ))}
      </div>

      {/* ── Loading Spinner ── */}
      {isLoading && entries.length === 0 && (
        <div className="p-12 text-center text-zinc-500 font-mono text-xs flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-amber-400" />
          <span>Fetching verified member standings...</span>
        </div>
      )}

      {/* ── Empty State (When no real member attempts have been submitted) ── */}
      {!isLoading && entries.length === 0 && (
        <div className="p-8 sm:p-12 rounded-3xl bg-zinc-950/80 border border-white/10 text-center space-y-4 max-w-xl mx-auto shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-400/10">
            <Trophy size={28} />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-base sm:text-lg font-bold text-white">
              No Member Submissions Yet
            </h4>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
              This leaderboard records strictly verified AIIC student attempts. Be the first member to complete a lecture exam and claim the <strong>#1 Champion</strong> spot on the podium!
            </p>
          </div>
          {onStartQuiz && (
            <div className="pt-2">
              <button
                onClick={onStartQuiz}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold inline-flex items-center gap-2 transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                <Play size={13} className="fill-black" />
                <span>Take a Lecture Quiz</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Dynamic Podium Display (When 1, 2, or 3+ Real Members Exist) ── */}
      {topThree.length > 0 && !searchQuery && (
        <div className="pt-4 max-w-2xl mx-auto">
          {topThree.length === 1 && (
            /* Single Leader Podium */
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-amber-500/20 via-zinc-950 to-zinc-950 border border-amber-400/40 text-center flex flex-col items-center space-y-2 max-w-sm mx-auto shadow-xl shadow-amber-500/10 relative">
              <div className="absolute -top-3.5 px-3 py-0.5 rounded-full bg-amber-400 text-black text-[10px] sm:text-[11px] font-mono font-black shadow-lg shadow-amber-500/30 flex items-center gap-1">
                <Trophy size={11} />
                <span>CHAMPION 🥇</span>
              </div>
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full ring-2 ring-amber-400 overflow-hidden bg-zinc-800 flex items-center justify-center mt-2 shadow-md">
                {topThree[0].userAvatar ? (
                  <img src={topThree[0].userAvatar} alt={topThree[0].userName} className="w-full h-full object-cover" />
                ) : (
                  <User size={24} className="text-amber-300" />
                )}
              </div>
              <div className="text-sm font-bold text-white truncate max-w-full px-1">{topThree[0].userName}</div>
              <div className="text-[11px] font-mono text-zinc-400">{topThree[0].userHandle}</div>
              <div className="text-sm font-mono text-amber-300 font-black">{topThree[0].totalScore} pts</div>
              <div className="text-[10px] font-mono text-emerald-400 font-semibold">{topThree[0].averageAccuracy}% Acc · {topThree[0].fastestTimeSeconds}s</div>
            </div>
          )}

          {topThree.length === 2 && (
            /* 2 Leaders Podium */
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto items-end">
              {/* Rank 2 */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 text-center flex flex-col items-center space-y-2 relative">
                <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-zinc-300 text-zinc-950 text-[10px] font-mono font-black shadow">
                  2ND 🥈
                </div>
                <div className="w-12 h-12 rounded-full ring-2 ring-zinc-300/40 overflow-hidden bg-zinc-800 flex items-center justify-center mt-2">
                  {topThree[1].userAvatar ? (
                    <img src={topThree[1].userAvatar} alt={topThree[1].userName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} className="text-zinc-400" />
                  )}
                </div>
                <div className="text-xs font-bold text-white truncate max-w-full px-1">{topThree[1].userName}</div>
                <div className="text-xs font-mono text-amber-400 font-bold">{topThree[1].totalScore} pts</div>
                <div className="text-[10px] font-mono text-zinc-500">{topThree[1].averageAccuracy}% Acc</div>
              </div>

              {/* Rank 1 */}
              <div className="p-5 rounded-3xl bg-gradient-to-b from-amber-500/20 via-zinc-950 to-zinc-950 border border-amber-400/40 text-center flex flex-col items-center space-y-2 -mt-4 shadow-xl relative">
                <div className="absolute -top-3.5 px-3 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-mono font-black shadow-lg flex items-center gap-1">
                  <Trophy size={11} />
                  <span>1ST 🥇</span>
                </div>
                <div className="w-14 h-14 rounded-full ring-2 ring-amber-400 overflow-hidden bg-zinc-800 flex items-center justify-center mt-2 shadow-md">
                  {topThree[0].userAvatar ? (
                    <img src={topThree[0].userAvatar} alt={topThree[0].userName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={22} className="text-amber-300" />
                  )}
                </div>
                <div className="text-xs font-bold text-white truncate max-w-full px-1">{topThree[0].userName}</div>
                <div className="text-xs font-mono text-amber-300 font-black">{topThree[0].totalScore} pts</div>
                <div className="text-[10px] font-mono text-emerald-400 font-semibold">{topThree[0].averageAccuracy}% Acc</div>
              </div>
            </div>
          )}

          {topThree.length >= 3 && (
            /* Full 3 Podium */
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end">
              {/* Rank 2 (Silver) */}
              <div className="p-3 sm:p-4 rounded-2xl bg-zinc-950 border border-white/10 text-center flex flex-col items-center space-y-1.5 sm:space-y-2 order-1 relative">
                <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-zinc-300 text-zinc-950 text-[9px] sm:text-[10px] font-mono font-black shadow">
                  2ND 🥈
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full ring-2 ring-zinc-300/40 overflow-hidden bg-zinc-800 flex items-center justify-center mt-2">
                  {topThree[1].userAvatar ? (
                    <img src={topThree[1].userAvatar} alt={topThree[1].userName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} className="text-zinc-400" />
                  )}
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-white truncate max-w-full px-1">{topThree[1].userName}</div>
                <div className="text-[10px] sm:text-[11px] font-mono text-amber-400 font-bold">{topThree[1].totalScore} pts</div>
                <div className="text-[9px] sm:text-[10px] font-mono text-zinc-500">{topThree[1].averageAccuracy}% Acc</div>
              </div>

              {/* Rank 1 (Gold - Elevated) */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-amber-500/20 via-zinc-950 to-zinc-950 border border-amber-400/40 text-center flex flex-col items-center space-y-2 order-2 -mt-4 shadow-xl shadow-amber-500/10 relative">
                <div className="absolute -top-3.5 px-3 py-0.5 rounded-full bg-amber-400 text-black text-[10px] sm:text-[11px] font-mono font-black shadow-lg shadow-amber-500/30 flex items-center gap-1">
                  <Trophy size={11} />
                  <span>CHAMPION 🥇</span>
                </div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full ring-2 ring-amber-400 overflow-hidden bg-zinc-800 flex items-center justify-center mt-2 shadow-md">
                  {topThree[0].userAvatar ? (
                    <img src={topThree[0].userAvatar} alt={topThree[0].userName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-amber-300" />
                  )}
                </div>
                <div className="text-xs sm:text-sm font-bold text-white truncate max-w-full px-1">{topThree[0].userName}</div>
                <div className="text-xs sm:text-sm font-mono text-amber-300 font-black">{topThree[0].totalScore} pts</div>
                <div className="text-[9px] sm:text-[10px] font-mono text-emerald-400 font-semibold">{topThree[0].averageAccuracy}% Acc · {topThree[0].fastestTimeSeconds}s</div>
              </div>

              {/* Rank 3 (Bronze) */}
              <div className="p-3 sm:p-4 rounded-2xl bg-zinc-950 border border-white/10 text-center flex flex-col items-center space-y-1.5 sm:space-y-2 order-3 relative">
                <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-amber-700 text-amber-100 text-[9px] sm:text-[10px] font-mono font-black shadow">
                  3RD 🥉
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full ring-2 ring-amber-700/40 overflow-hidden bg-zinc-800 flex items-center justify-center mt-2">
                  {topThree[2].userAvatar ? (
                    <img src={topThree[2].userAvatar} alt={topThree[2].userName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} className="text-zinc-400" />
                  )}
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-white truncate max-w-full px-1">{topThree[2].userName}</div>
                <div className="text-[10px] sm:text-[11px] font-mono text-amber-400 font-bold">{topThree[2].totalScore} pts</div>
                <div className="text-[9px] sm:text-[10px] font-mono text-zinc-500">{topThree[2].averageAccuracy}% Acc</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Real Member Rankings Table (Only shown when real entries exist) ── */}
      {filteredEntries.length > 0 && (
        <div className="rounded-2xl bg-zinc-950/80 border border-white/10 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-12 gap-2 px-3 sm:px-4 py-3 bg-white/5 border-b border-white/10 font-mono text-[10px] sm:text-[11px] text-zinc-400 uppercase tracking-wider">
            <div className="col-span-2 sm:col-span-1 text-center">#</div>
            <div className="col-span-5 sm:col-span-4">Member</div>
            <div className="col-span-5 sm:col-span-3 text-right">Score &amp; Acc</div>
            <div className="hidden sm:block sm:col-span-2 text-center">Fastest Time</div>
            <div className="hidden sm:block sm:col-span-2 text-right">Badge</div>
          </div>

          <div className="divide-y divide-white/5">
            {filteredEntries.map((entry) => {
              const isTop1 = entry.rank === 1;

              return (
                <div
                  key={`${entry.userId}-${entry.rank}`}
                  className={`grid grid-cols-12 gap-2 px-3 sm:px-4 py-3 sm:py-3.5 items-center hover:bg-white/[0.03] transition-colors ${
                    isTop1 ? "bg-amber-500/[0.04]" : ""
                  }`}
                >
                  {/* Rank Badge */}
                  <div className="col-span-2 sm:col-span-1 text-center font-mono text-xs font-bold">
                    {entry.rank === 1 && <span className="text-amber-400">1 🥇</span>}
                    {entry.rank === 2 && <span className="text-zinc-300">2 🥈</span>}
                    {entry.rank === 3 && <span className="text-amber-700">3 🥉</span>}
                    {entry.rank > 3 && <span className="text-zinc-500">{entry.rank}</span>}
                  </div>

                  {/* Student Info */}
                  <div className="col-span-5 sm:col-span-4 flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center text-[11px] font-bold text-zinc-400 ring-1 ring-white/10">
                      {entry.userAvatar ? (
                        <img src={entry.userAvatar} alt={entry.userName} className="w-full h-full object-cover" />
                      ) : (
                        entry.userName?.slice(0, 1) || "M"
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{entry.userName}</div>
                      <div className="text-[10px] font-mono text-zinc-500 truncate">{entry.userHandle}</div>
                    </div>
                  </div>

                  {/* Score & Accuracy */}
                  <div className="col-span-5 sm:col-span-3 text-right">
                    <div className="text-xs font-mono font-bold text-amber-400">{entry.totalScore} pts</div>
                    <div className="text-[10px] font-mono text-emerald-400/90">{entry.averageAccuracy}% Accuracy</div>
                  </div>

                  {/* Fastest Time */}
                  <div className="hidden sm:block sm:col-span-2 text-center font-mono text-xs text-zinc-400">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[11px]">
                      <Clock size={11} className="text-zinc-500" />
                      {entry.fastestTimeSeconds}s
                    </span>
                  </div>

                  {/* Badge */}
                  <div className="hidden sm:block sm:col-span-2 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300 font-mono text-[10px] truncate max-w-full">
                      {entry.topBadge || "AIIC Scholar"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
