"use client"

import { useState } from "react"
import { Flame, Activity, ShieldCheck, Zap } from "lucide-react"
import { MuscleSetsMap, calculateMuscleSets } from "@/lib/workout-presets"
import { cn } from "@/lib/utils"

interface MuscleMapProps {
  workouts: Array<{ workout_date: string; exercises?: any[] }>
  className?: string
}

type TimeRange = "week" | "30d" | "90d" | "all"
type ViewMode = "balance" | "fatigue" | "strength"

const COLOR_STEPS: Record<number, string> = {
  0: "#222222",
  1: "#0e4429", // 1-4 sets
  2: "#006d32", // 5-9 sets
  3: "#26a641", // 10-15 sets
  4: "#39d353", // >15 sets
}

function getMuscleColor(sets: number, mode: ViewMode): string {
  if (mode === "fatigue") {
    // If recently worked, fatigued (amber/red), if rested, recovered (green)
    if (sets >= 12) return "#f59e0b" // high fatigue (amber)
    if (sets >= 6) return "#22c55e" // optimal stimulation (green)
    if (sets > 0) return "#10b981" // recovered (emerald)
    return "#222222" // fresh/idle
  }
  if (sets >= 15) return COLOR_STEPS[4]
  if (sets >= 10) return COLOR_STEPS[3]
  if (sets >= 5) return COLOR_STEPS[2]
  if (sets >= 1) return COLOR_STEPS[1]
  return COLOR_STEPS[0]
}

export function MuscleMap({ workouts, className = "" }: MuscleMapProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("balance")
  const [timeRange, setTimeRange] = useState<TimeRange>("week")

  const setsMap: MuscleSetsMap = calculateMuscleSets(workouts, timeRange)

  const chestColor = getMuscleColor(setsMap.chest, viewMode)
  const backColor = getMuscleColor(setsMap.back, viewMode)
  const legsColor = getMuscleColor(setsMap.legs, viewMode)
  const shouldersColor = getMuscleColor(setsMap.shoulders, viewMode)
  const armsColor = getMuscleColor(setsMap.arms, viewMode)
  const coreColor = getMuscleColor(setsMap.core, viewMode)

  const totalSetsInRange = Object.values(setsMap).reduce((a, b) => a + b, 0)

  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-[#141414] p-5 sm:p-6 flex flex-col justify-between transition-all hover:border-white/10",
        className
      )}
    >
      {/* Top Segmented Controls: Muscle balance | Fatigue | Strength */}
      <div className="flex items-center justify-between gap-1 border-b border-white/5 pb-3">
        <div className="inline-flex rounded-lg bg-[#1f1f1f] p-1 border border-white/5">
          <button
            type="button"
            onClick={() => setViewMode("balance")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === "balance"
                ? "bg-[#2c2c2c] text-white shadow-sm"
                : "text-spotify-muted hover:text-white"
            }`}
          >
            Muscle balance
          </button>
          <button
            type="button"
            onClick={() => setViewMode("fatigue")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === "fatigue"
                ? "bg-[#2c2c2c] text-white shadow-sm"
                : "text-spotify-muted hover:text-white"
            }`}
          >
            Fatigue
          </button>
          <button
            type="button"
            onClick={() => setViewMode("strength")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === "strength"
                ? "bg-[#2c2c2c] text-white shadow-sm"
                : "text-spotify-muted hover:text-white"
            }`}
          >
            Strength
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-primary font-bold">
          <Flame className="h-4 w-4" />
          <span>{totalSetsInRange} sets</span>
        </div>
      </div>

      {/* Sub-header & Time Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="text-xs text-spotify-muted font-medium">
          {viewMode === "balance" && "Muscle balance · by sets worked"}
          {viewMode === "fatigue" && "Muscle fatigue & recovery"}
          {viewMode === "strength" && "Volume load distribution"}
        </div>

        {/* Time Filter Pills: Week | 30d | 90d | All */}
        <div className="inline-flex rounded-lg bg-[#1c1c1c] p-1 border border-white/5 self-start sm:self-auto">
          {(["week", "30d", "90d", "all"] as TimeRange[]).map((tr) => (
            <button
              key={tr}
              type="button"
              onClick={() => setTimeRange(tr)}
              className={`rounded px-2.5 py-1 text-xs font-bold uppercase transition-all ${
                timeRange === tr
                  ? "bg-[#2e2e2e] text-white shadow-sm"
                  : "text-spotify-muted hover:text-white"
              }`}
            >
              {tr === "week" ? "Week" : tr}
            </button>
          ))}
        </div>
      </div>

      {/* Front & Back Anatomical Diagram - Scaled & Flex-centered */}
      <div className="flex-1 flex items-center justify-center gap-6 sm:gap-14 py-2 min-h-[260px]">
        {/* FRONT BODY */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-spotify-muted mb-2">
            Front
          </span>
          <svg
            viewBox="0 0 120 220"
            className="w-32 h-56 sm:w-36 sm:h-64 lg:w-44 lg:h-76 filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]"
          >
            {/* Silhouette Outline / Base */}
            <g fill="none" stroke="#2e2e2e" strokeWidth="0.8">
              {/* Head & Neck */}
              <ellipse cx="60" cy="18" rx="10" ry="13" fill="#222" />
              <path d="M55 31 L55 38 L65 38 L65 31 Z" fill="#222" />

              {/* Shoulders (Deltoids Front) */}
              <path
                d="M45 40 C40 42 36 47 34 54 C35 56 42 55 45 49 Z"
                fill={shouldersColor}
                className="transition-colors duration-300"
              />
              <path
                d="M75 40 C80 42 84 47 86 54 C85 56 78 55 75 49 Z"
                fill={shouldersColor}
                className="transition-colors duration-300"
              />

              {/* Chest (Pectorals) */}
              <path
                d="M46 43 C53 43 58 45 59 56 C53 58 46 56 44 49 Z"
                fill={chestColor}
                className="transition-colors duration-300"
              />
              <path
                d="M74 43 C67 43 62 45 61 56 C67 58 74 56 76 49 Z"
                fill={chestColor}
                className="transition-colors duration-300"
              />

              {/* Biceps (Arms) */}
              <path
                d="M33 56 C31 63 30 72 32 78 C35 76 37 68 36 58 Z"
                fill={armsColor}
                className="transition-colors duration-300"
              />
              <path
                d="M87 56 C89 63 90 72 88 78 C85 76 83 68 84 58 Z"
                fill={armsColor}
                className="transition-colors duration-300"
              />

              {/* Forearms */}
              <path
                d="M31 80 C28 89 25 101 24 109 C27 108 31 99 33 86 Z"
                fill={armsColor}
                className="transition-colors duration-300"
              />
              <path
                d="M89 80 C92 89 95 101 96 109 C93 108 89 99 87 86 Z"
                fill={armsColor}
                className="transition-colors duration-300"
              />

              {/* Abdominals / Core */}
              <path
                d="M48 59 C52 59 58 59 59 66 C57 67 50 67 48 66 Z"
                fill={coreColor}
                className="transition-colors duration-300"
              />
              <path
                d="M72 59 C68 59 62 59 61 66 C63 67 70 67 72 66 Z"
                fill={coreColor}
                className="transition-colors duration-300"
              />
              <path
                d="M49 68 C53 68 58 68 59 75 C57 76 50 76 49 75 Z"
                fill={coreColor}
                className="transition-colors duration-300"
              />
              <path
                d="M71 68 C67 68 62 68 61 75 C63 76 70 76 71 75 Z"
                fill={coreColor}
                className="transition-colors duration-300"
              />
              <path
                d="M50 77 C54 77 58 77 59 85 C56 86 51 85 50 84 Z"
                fill={coreColor}
                className="transition-colors duration-300"
              />
              <path
                d="M70 77 C66 77 62 77 61 85 C64 86 69 85 70 84 Z"
                fill={coreColor}
                className="transition-colors duration-300"
              />

              {/* Quads (Upper Legs) */}
              <path
                d="M44 94 C44 110 43 128 47 142 C54 140 57 122 57 101 C53 96 48 94 44 94 Z"
                fill={legsColor}
                className="transition-colors duration-300"
              />
              <path
                d="M76 94 C76 110 77 128 73 142 C66 140 63 122 63 101 C67 96 72 94 76 94 Z"
                fill={legsColor}
                className="transition-colors duration-300"
              />

              {/* Knees */}
              <circle cx="48" cy="148" r="4" fill="#262626" />
              <circle cx="72" cy="148" r="4" fill="#262626" />

              {/* Calves (Lower Legs Front) */}
              <path
                d="M45 154 C42 166 43 182 46 195 C49 194 52 184 52 168 C52 159 49 155 45 154 Z"
                fill={legsColor}
                className="transition-colors duration-300"
              />
              <path
                d="M75 154 C78 166 77 182 74 195 C71 194 68 184 68 168 C68 159 71 155 75 154 Z"
                fill={legsColor}
                className="transition-colors duration-300"
              />
            </g>
          </svg>
        </div>

        {/* BACK BODY */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-spotify-muted mb-2">
            Back
          </span>
          <svg
            viewBox="0 0 120 220"
            className="w-32 h-56 sm:w-36 sm:h-64 lg:w-44 lg:h-76 filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]"
          >
            <g fill="none" stroke="#2e2e2e" strokeWidth="0.8">
              {/* Head & Neck Back */}
              <ellipse cx="60" cy="18" rx="10" ry="13" fill="#222" />
              <path d="M55 31 L55 38 L65 38 L65 31 Z" fill="#222" />

              {/* Traps (Upper Back) */}
              <path
                d="M60 38 L48 45 L54 62 L60 68 L66 62 L72 45 Z"
                fill={backColor}
                className="transition-colors duration-300"
              />

              {/* Rear Deltoids */}
              <path
                d="M45 42 C40 44 35 49 33 56 C36 57 43 54 46 48 Z"
                fill={shouldersColor}
                className="transition-colors duration-300"
              />
              <path
                d="M75 42 C80 44 85 49 87 56 C84 57 77 54 74 48 Z"
                fill={shouldersColor}
                className="transition-colors duration-300"
              />

              {/* Lats (V-Taper Mid Back) */}
              <path
                d="M46 58 C41 65 43 78 48 88 C53 87 54 74 54 65 Z"
                fill={backColor}
                className="transition-colors duration-300"
              />
              <path
                d="M74 58 C79 65 77 78 72 88 C67 87 66 74 66 65 Z"
                fill={backColor}
                className="transition-colors duration-300"
              />

              {/* Lower Back */}
              <path
                d="M52 74 L55 90 L65 90 L68 74 Z"
                fill={backColor}
                className="transition-colors duration-300"
              />

              {/* Triceps (Arms Back) */}
              <path
                d="M32 58 C30 66 30 75 32 80 C35 78 37 70 36 60 Z"
                fill={armsColor}
                className="transition-colors duration-300"
              />
              <path
                d="M88 58 C90 66 90 75 88 80 C85 78 83 70 84 60 Z"
                fill={armsColor}
                className="transition-colors duration-300"
              />

              {/* Forearms Back */}
              <path
                d="M31 82 C28 91 25 101 24 109 C27 108 31 99 33 87 Z"
                fill={armsColor}
                className="transition-colors duration-300"
              />
              <path
                d="M89 82 C92 91 95 101 96 109 C93 108 89 99 87 87 Z"
                fill={armsColor}
                className="transition-colors duration-300"
              />

              {/* Glutes (Buttocks) */}
              <path
                d="M43 93 C41 106 45 116 58 116 C59 110 59 100 58 93 Z"
                fill={legsColor}
                className="transition-colors duration-300"
              />
              <path
                d="M77 93 C79 106 75 116 62 116 C61 110 61 100 62 93 Z"
                fill={legsColor}
                className="transition-colors duration-300"
              />

              {/* Hamstrings (Back Upper Legs) */}
              <path
                d="M43 118 C42 131 44 142 48 146 C54 144 57 134 57 118 Z"
                fill={legsColor}
                className="transition-colors duration-300"
              />
              <path
                d="M77 118 C78 131 76 142 72 146 C66 144 63 134 63 118 Z"
                fill={legsColor}
                className="transition-colors duration-300"
              />

              {/* Calves Back */}
              <path
                d="M44 153 C41 166 42 183 46 195 C50 193 53 182 53 166 C53 158 49 154 44 153 Z"
                fill={legsColor}
                className="transition-colors duration-300"
              />
              <path
                d="M76 153 C79 166 78 183 74 195 C70 193 67 182 67 166 C67 158 71 154 76 153 Z"
                fill={legsColor}
                className="transition-colors duration-300"
              />
            </g>
          </svg>
        </div>
      </div>

      {/* Sets Breakdown Quick Badges - Scaled Up (English Only) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-3 border-t border-white/5">
        <div className="rounded-lg bg-[#181818] p-2.5 text-center border border-white/5">
          <span className="text-xs text-spotify-muted font-medium block">Chest</span>
          <span className="text-sm font-extrabold text-white tabular-nums">{setsMap.chest} sets</span>
        </div>
        <div className="rounded-lg bg-[#181818] p-2.5 text-center border border-white/5">
          <span className="text-xs text-spotify-muted font-medium block">Back</span>
          <span className="text-sm font-extrabold text-white tabular-nums">{setsMap.back} sets</span>
        </div>
        <div className="rounded-lg bg-[#181818] p-2.5 text-center border border-white/5">
          <span className="text-xs text-spotify-muted font-medium block">Legs</span>
          <span className="text-sm font-extrabold text-white tabular-nums">{setsMap.legs} sets</span>
        </div>
        <div className="rounded-lg bg-[#181818] p-2.5 text-center border border-white/5">
          <span className="text-xs text-spotify-muted font-medium block">Shoulders</span>
          <span className="text-sm font-extrabold text-white tabular-nums">{setsMap.shoulders} sets</span>
        </div>
        <div className="rounded-lg bg-[#181818] p-2.5 text-center border border-white/5">
          <span className="text-xs text-spotify-muted font-medium block">Arms</span>
          <span className="text-sm font-extrabold text-white tabular-nums">{setsMap.arms} sets</span>
        </div>
        <div className="rounded-lg bg-[#181818] p-2.5 text-center border border-white/5">
          <span className="text-xs text-spotify-muted font-medium block">Core</span>
          <span className="text-sm font-extrabold text-white tabular-nums">{setsMap.core} sets</span>
        </div>
      </div>
    </div>
  )
}
