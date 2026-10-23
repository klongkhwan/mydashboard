"use client"

import { useId, useState } from "react"
import { Activity, Flame } from "lucide-react"
import { MuscleSetsMap, calculateMuscleSets } from "@/lib/workout-presets"
import { cn } from "@/lib/utils"

interface MuscleMapProps {
  workouts: Array<{ workout_date: string; exercises?: any[] }>
  className?: string
}

type TimeRange = "week" | "30d" | "90d" | "all"
type ViewMode = "balance" | "fatigue" | "strength"

const MUSCLE_LABELS = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  arms: "Arms",
  core: "Core",
}
type MuscleGroup = keyof typeof MUSCLE_LABELS

const COLOR_STEPS = ["#485253", "#0e4429", "#006d32", "#26a641", "#39d353"]

function getMuscleColor(sets: number, mode: ViewMode): string {
  if (mode === "fatigue") {
    if (sets >= 12) return "#f59e0b"
    if (sets >= 6) return "#22c55e"
    if (sets > 0) return "#10b981"
    return COLOR_STEPS[0]
  }
  if (sets >= 15) return COLOR_STEPS[4]
  if (sets >= 10) return COLOR_STEPS[3]
  if (sets >= 5) return COLOR_STEPS[2]
  if (sets >= 1) return COLOR_STEPS[1]
  return COLOR_STEPS[0]
}

// One continuous silhouette keeps the joints, hands and feet connected beneath the muscle layers.
const BODY_OUTLINE = "M110 20C98 20 91 28 92 42L94 57Q96 69 102 73L101 85C96 90 85 93 73 96C57 96 48 106 45 121L39 152C35 164 33 176 32 185L22 219C19 222 16 230 17 238L19 249Q21 252 23 248L23 239L25 250Q28 253 29 249L29 238L31 246Q34 248 35 244L34 234L38 238Q42 239 41 235L36 224L46 197C51 184 54 173 55 164L64 143C68 161 73 178 80 191L83 205C78 215 74 227 75 244L81 287C84 299 82 306 79 318C76 333 82 363 85 388L83 400L77 410Q75 418 83 419L97 419Q103 417 102 410L100 391L101 359C103 342 106 328 103 314L101 299L108 244Q110 237 112 244L119 299L117 314C114 328 117 342 119 359L120 391L118 410Q117 417 123 419L137 419Q145 418 143 410L137 400L135 388C138 363 144 333 141 318C138 306 136 299 139 287L145 244C146 227 142 215 137 205L140 191C147 178 152 161 156 143L165 164C166 173 169 184 174 197L184 224L179 235Q178 239 182 238L186 234L185 244Q186 248 189 246L191 238L191 249Q192 253 195 250L197 239L197 248Q199 252 201 249L203 238C204 230 201 222 198 219L188 185C187 176 185 164 181 152L175 121C172 106 163 96 147 96C135 93 124 90 119 85L118 73Q124 69 126 57L128 42C129 28 122 20 110 20Z"

// Draw the left side once and mirror it so both views stay anatomically balanced.
const FRONT_MUSCLES: Partial<Record<MuscleGroup, string[]>> = {
  shoulders: ["M71 99C58 99 50 109 49 124L57 134C59 121 65 114 76 111Z"],
  chest: ["M78 103C87 100 101 103 108 109L107 136C96 142 78 136 67 125L72 113Z"],
  arms: [
    "M49 130C44 142 41 155 41 167C47 169 53 158 57 144L57 136Z",
    "M40 174C35 187 30 206 27 220L34 225C41 212 47 191 48 178Z",
    "M51 152L49 173L43 181L42 173Z",
  ],
  core: [
    "M97 143Q103 141 108 144L108 158Q100 162 94 158Z",
    "M94 162Q101 165 108 162L108 176Q99 179 94 175Z",
    "M95 180Q102 182 108 179L108 192Q101 197 97 193Z",
    "M98 198L108 196L108 213Q100 211 98 198Z",
    "M70 136L88 147L90 175L79 166Z",
    "M80 174L91 181L95 203L85 196Z",
  ],
  legs: [
    "M84 214C75 230 81 259 85 277C91 267 93 243 91 225Z",
    "M95 224C92 242 94 264 94 280C101 276 104 248 105 237Z",
    "M99 274C92 279 87 286 87 294Q96 301 99 289Z",
    "M84 313C79 329 85 355 88 373C93 362 94 339 91 321Z",
    "M97 312C96 331 94 362 94 384L98 391L100 348L101 329Z",
  ],
}

const BACK_MUSCLES: Partial<Record<MuscleGroup, string[]>> = {
  shoulders: ["M71 100C57 99 49 110 49 125L58 135C60 120 68 116 77 113Z"],
  back: [
    "M103 86L81 101L92 119L108 130L108 103Z",
    "M78 114L68 128C71 142 84 156 98 165L108 141L91 129Z",
    "M69 138C69 156 78 180 86 193L98 174L89 157Z",
    "M105 151L94 178L89 201L108 210L108 167Z",
  ],
  arms: [
    "M49 131C43 143 40 158 41 170C49 169 55 155 57 139Z",
    "M40 176C35 189 29 208 27 220L34 225C40 211 46 193 48 178Z",
  ],
  legs: [
    "M86 209C78 217 77 231 80 245C89 250 102 248 108 238L108 215L96 207Z",
    "M81 252C81 264 83 281 87 294L94 290L94 254Z",
    "M98 252L97 287L100 295L105 260L106 249Z",
    "M85 309C79 321 81 343 87 357C92 352 95 340 94 322L90 309Z",
    "M98 309C94 322 96 345 99 355L102 329Z",
  ],
}

function AthleteFigure({ side, setsMap, viewMode, timeRange }: {
  side: "front" | "back"
  setsMap: MuscleSetsMap
  viewMode: ViewMode
  timeRange: TimeRange
}) {
  const id = useId()
  const label = side === "front" ? "Front" : "Back"
  const muscles = side === "front" ? FRONT_MUSCLES : BACK_MUSCLES
  const groups = Object.keys(muscles) as MuscleGroup[]
  const summary = (Object.keys(MUSCLE_LABELS) as MuscleGroup[])
    .map((group) => `${MUSCLE_LABELS[group]}: ${setsMap[group]} sets`).join(", ")

  return (
    <figure className="relative flex min-w-0 flex-col items-center">
      <svg viewBox="0 0 220 440" role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
        className="relative w-full max-w-[210px] overflow-visible">
        <title id={`${id}-title`}>{`${label} muscle map`}</title>
        <desc id={`${id}-description`}>{`${summary}. Completed sets, ${timeRange}, ${viewMode} view.`}</desc>
        <defs>
          <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="0.35">
            <stop stopColor="#1d2426" />
            <stop offset=".3" stopColor="#566263" />
            <stop offset=".48" stopColor="#353e40" />
            <stop offset=".72" stopColor="#252d30" />
            <stop offset="1" stopColor="#141a1c" />
          </linearGradient>
          <linearGradient id={`${id}-rim`} x1="0" y1="0" x2=".8" y2="1">
            <stop stopColor="#b5c7c4" stopOpacity=".65" />
            <stop offset=".45" stopColor="#758683" stopOpacity=".12" />
            <stop offset="1" stopColor="#93a8a3" stopOpacity=".3" />
          </linearGradient>
          <radialGradient id={`${id}-floor`}>
            <stop stopColor="var(--primary)" stopOpacity=".12" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
          {groups.map((group) => {
            const color = getMuscleColor(setsMap[group], viewMode)
            return (
              <linearGradient key={group} id={`${id}-${group}`} x1="0" y1="0" x2=".9" y2=".75">
                <stop stopColor={`color-mix(in srgb, ${color}, white 22%)`} />
                <stop offset=".28" stopColor={color} />
                <stop offset=".7" stopColor={`color-mix(in srgb, ${color}, black 22%)`} />
                <stop offset="1" stopColor={`color-mix(in srgb, ${color}, black 55%)`} />
              </linearGradient>
            )
          })}
        </defs>

        <g aria-hidden="true">
          <ellipse cx="110" cy="421" rx="86" ry="16" fill={`url(#${id}-floor)`} />
          <ellipse cx="110" cy="420" rx="54" ry="7" fill="#000" opacity=".45" />
          <ellipse cx="110" cy="420" rx="76" ry="11" fill="none" stroke="var(--primary)" strokeOpacity=".12" strokeWidth=".75" />
          <path d={BODY_OUTLINE} fill={`url(#${id}-body)`} stroke={`url(#${id}-rim)`} strokeWidth="1.1" />

          {[false, true].map((mirrored) => (
            <g key={String(mirrored)} transform={mirrored ? "translate(220 0) scale(-1 1)" : undefined}>
              {groups.map((group) => (
                <g key={group} fill={`url(#${id}-${group})`} stroke="#a9bcb6" strokeOpacity=".18" strokeWidth=".65" strokeLinejoin="round">
                  {muscles[group]?.map((path) => <path key={path} d={path} />)}
                </g>
              ))}
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                {side === "front" ? (
                  <>
                    <path d="M102 77L106 97L84 99M94 60Q100 73 107 73M77 106Q91 103 103 110M73 127Q87 138 103 136" stroke="#b2c3bd" strokeOpacity=".23" strokeWidth="1" />
                    <path d="M96 44L103 43M99 59L107 61M72 139L83 145M75 149L85 155M84 205L104 219M87 299Q92 303 98 298M88 378L91 396M82 409L97 411" stroke="#10181a" strokeOpacity=".7" strokeWidth="1.2" />
                    <path d="M83 223Q80 241 85 257M86 319Q83 334 87 346M51 139L46 157M38 187L30 215" stroke="#c6d6d0" strokeOpacity=".16" />
                  </>
                ) : (
                  <>
                    <path d="M105 78L108 100M82 106L100 120M76 123L91 140M75 144L89 158M82 215Q92 209 104 216M84 314Q82 331 87 342" stroke="#c6d6d0" strokeOpacity=".2" />
                    <path d="M108 108L109 205M82 246Q96 252 106 243M87 298L98 300M89 360L92 397M83 409L98 410" stroke="#10181a" strokeOpacity=".7" strokeWidth="1.3" />
                  </>
                )}
                <path d="M23 228L25 235M28 228L30 235M102 224L107 232" stroke="#11191b" strokeOpacity=".65" strokeWidth=".9" />
              </g>
            </g>
          ))}
          {side === "front" && <path d="M110 47L108 55L112 56M107 65H113M110 110V134M110 144V210" fill="none" stroke="#11191b" strokeWidth="1" strokeOpacity=".6" strokeLinecap="round" />}
          {side === "back" && <path d="M98 54Q110 59 122 54M110 86V104" fill="none" stroke="#a2b5af" strokeOpacity=".15" strokeWidth="1" />}
        </g>
      </svg>
      <figcaption className="mt-2 flex w-full max-w-36 items-center gap-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" />{label}<span className="h-px flex-1 bg-border" />
      </figcaption>
    </figure>
  )
}

const VIEW_MODES = [
  { value: "balance", label: "Muscle balance", description: "Muscle balance · by sets worked" },
  { value: "fatigue", label: "Fatigue", description: "Muscle fatigue & recovery" },
  { value: "strength", label: "Strength", description: "Volume load distribution" },
] as const

export function MuscleMap({ workouts, className = "" }: MuscleMapProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("balance")
  const [timeRange, setTimeRange] = useState<TimeRange>("week")
  const setsMap: MuscleSetsMap = calculateMuscleSets(workouts, timeRange)
  const totalSetsInRange = Object.values(setsMap).reduce((a, b) => a + b, 0)
  const controlClass = "rounded-md px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none"

  return (
    <div className={cn("@container/muscles flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-card sm:p-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Activity className="h-4 w-4 text-primary" aria-hidden="true" />Muscle map
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tabular-nums text-primary">
          <Flame className="h-3.5 w-3.5" aria-hidden="true" />{totalSetsInRange} sets
        </span>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1" role="group" aria-label="Muscle map view">
        {VIEW_MODES.map((mode) => (
          <button key={mode.value} type="button" aria-pressed={viewMode === mode.value} onClick={() => setViewMode(mode.value)}
            className={cn(controlClass, "flex-1 whitespace-nowrap", viewMode === mode.value ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground")}>
            {mode.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{VIEW_MODES.find((mode) => mode.value === viewMode)?.description}</p>
        <div className="inline-flex flex-wrap gap-1" role="group" aria-label="Muscle map time range">
          {(["week", "30d", "90d", "all"] as TimeRange[]).map((range) => (
            <button key={range} type="button" aria-pressed={timeRange === range} onClick={() => setTimeRange(range)}
              className={cn(controlClass, "px-2.5 py-1.5", timeRange === range ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
              {range === "week" ? "Week" : range === "all" ? "All" : range}
            </button>
          ))}
        </div>
      </div>

      <div className="relative isolate flex flex-1 flex-col justify-center overflow-hidden rounded-lg border border-border/60 bg-background/50 px-2 pb-4 pt-5 sm:px-4">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_35%,color-mix(in_srgb,var(--primary)_5%,transparent),transparent_70%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-6 left-1/2 -z-10 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
        <div className="grid grid-cols-2 items-end gap-2 sm:gap-6">
          <AthleteFigure side="front" setsMap={setsMap} viewMode={viewMode} timeRange={timeRange} />
          <AthleteFigure side="back" setsMap={setsMap} viewMode={viewMode} timeRange={timeRange} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          {viewMode === "fatigue" ? (
            <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />1–5<span className="ml-2 h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />6–11<span className="ml-2 h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />12+ sets</>
          ) : (
            <><span>Fewer sets</span><span className="flex gap-1" aria-hidden="true">{COLOR_STEPS.map((color) => <span key={color} className="h-2 w-3 rounded-sm" style={{ backgroundColor: color }} />)}</span><span>More sets</span></>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 @min-[480px]/muscles:grid-cols-6">
        {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((group) => (
          <div key={group} className="min-w-0 rounded-lg border border-border bg-background/50 px-1 py-3 text-center">
            <dt className="text-xs text-muted-foreground">{MUSCLE_LABELS[group]}</dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">{setsMap[group]} <span className="text-xs font-normal text-muted-foreground">sets</span></dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
