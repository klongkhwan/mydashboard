"use client"

import { useId } from "react"
import { Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getGrowthStage, GROWTH_STAGES } from "@/lib/personal-growth"

interface GrowthCharacterProps {
  activeDays: number
  celebrationKey: number
}

export function GrowthCharacter({ activeDays, celebrationKey }: GrowthCharacterProps) {
  const titleId = useId()
  const stageIndex = getGrowthStage(activeDays)
  const stage = GROWTH_STAGES[stageIndex]
  const nextStage = GROWTH_STAGES[stageIndex + 1]
  const progress = nextStage ? Math.min(100, ((activeDays - stage.minDays) / (nextStage.minDays - stage.minDays)) * 100) : 100
  const hasHeadphones = stageIndex >= 1
  const hasShelf = stageIndex >= 2
  const hasNotes = stageIndex >= 3
  const isConfident = stageIndex >= 4

  return (
    <Card className="h-full min-w-0 gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Your Growth</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3 w-3" aria-hidden="true" /> Stage {stageIndex + 1}
        </span>
      </div>

      <svg viewBox="0 0 360 280" role="img" aria-labelledby={titleId} className="mx-auto w-full max-w-sm flex-1">
        <title id={titleId}>{`Your Growth — ${stage.label}, ${activeDays} active days`}</title>
        <ellipse cx="180" cy="139" rx="147" ry="119" fill="var(--primary)" opacity=".045" />
        <path d="M35 250H325" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="181" cy="249" rx="111" ry="9" fill="var(--background)" opacity=".65" />

        {hasShelf && (
          <g>
            <rect x="48" y="68" width="85" height="5" rx="2" fill="var(--muted-foreground)" opacity=".65" />
            <rect x="55" y="39" width="12" height="29" rx="2" fill="var(--primary)" opacity=".65" />
            <path d="M59 44H63M59 48H63" stroke="var(--primary-foreground)" opacity=".5" />
            <rect x="70" y="34" width="11" height="34" rx="2" fill="var(--info)" />
            <rect x="84" y="43" width="13" height="25" rx="2" fill="var(--warning)" />
            <rect x="102" y="38" width="10" height="30" rx="2" transform="rotate(-9 107 68)" fill="var(--muted-foreground)" />
          </g>
        )}

        {hasNotes && (
          <g>
            <rect x="243" y="40" width="43" height="49" rx="4" fill="var(--secondary)" stroke="var(--border)" strokeWidth="2" />
            <circle cx="265" cy="59" r="10" fill="var(--warning)" opacity=".25" />
            <path d="m265 52 2.2 4.6 5 .7-3.6 3.5.8 5-4.4-2.3-4.4 2.3.8-5-3.6-3.5 5-.7Z" fill="var(--warning)" />
            <path d="M253 77H276M257 81H272" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" />
            <rect x="293" y="85" width="24" height="25" rx="2" transform="rotate(7 305 97)" fill="var(--primary)" opacity=".5" />
            <path d="m299 93 11 1m-12 5 8 1" stroke="var(--primary-foreground)" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {isConfident && (
          <g>
            <rect x="45" y="159" width="38" height="85" rx="4" fill="var(--secondary)" stroke="var(--border)" strokeWidth="2" />
            <path d="M45 189H83M45 218H83" stroke="var(--border)" strokeWidth="2" />
            <path d="M51 180H76M51 175H70" stroke="var(--info)" strokeWidth="5" strokeLinecap="round" />
            <path d="M51 208H76M51 202H73" stroke="var(--warning)" strokeWidth="5" strokeLinecap="round" />
            <rect x="53" y="224" width="8" height="17" rx="1" fill="var(--primary)" opacity=".65" />
            <rect x="65" y="225" width="9" height="16" rx="1" fill="var(--info)" />
            <path d="M62 155V134M61 144c-12 0-14-9-14-9 11-2 15 6 15 6m0-2c0-10 12-14 12-14 1 10-5 15-12 15" fill="var(--primary)" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
            <path d="M52 151H73L70 162H55Z" fill="var(--warning)" />
          </g>
        )}

        <path d="M149 196V232M201 196V232" stroke="var(--muted-foreground)" strokeWidth="7" strokeLinecap="round" />
        <rect x="143" y="168" width="63" height="32" rx="12" fill="var(--secondary)" stroke="var(--border)" strokeWidth="2" />
        <path d="M161 222v20m27-20v20" stroke="#4c5663" strokeWidth="12" strokeLinecap="round" />
        <path d="M154 246h14m14 0h14" stroke="var(--foreground)" strokeWidth="9" strokeLinecap="round" />

        <g key={celebrationKey} className={celebrationKey > 0 ? "growth-celebrate" : undefined}>
          <path d="M147 146q30-18 57 0l8 49h-71Z" fill="var(--primary)" />
          <path d="M174 145v25" stroke="var(--primary-foreground)" strokeWidth="2" opacity=".15" />
          <path d={isConfident ? "M150 151q-15 9-17 25" : "M150 152q-14 11-11 25"} stroke="var(--primary)" strokeWidth="15" strokeLinecap="round" />
          <path d={isConfident ? "M201 151q17-11 15-29" : "M200 152q17 12 19 25"} stroke="var(--primary)" strokeWidth="15" strokeLinecap="round" />
          <path d="M165 130v13q9 9 19 0v-13" fill="#e6ae88" />
          <circle cx="146" cy="112" r="8" fill="#f4c6a0" />
          <circle cx="202" cy="112" r="8" fill="#f4c6a0" />
          <rect x="146" y="74" width="56" height="65" rx="26" fill="#f4c6a0" />
          <path d="M145 107q-10-31 12-41 20-12 40 6 13 12 6 37l-7-20q-23 8-39-2l-6 22Z" fill="#44372e" />
          <path d="M158 109h3m24 0h3" stroke="#44372e" strokeWidth="4" strokeLinecap="round" />
          <path d={isConfident || celebrationKey > 0 ? "M167 120q8 11 16 0Z" : "M168 122q7 6 13 0"} fill={isConfident || celebrationKey > 0 ? "#a55a52" : "none"} stroke="#a55a52" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="156" cy="120" rx="5" ry="3" fill="#e99985" opacity=".6" />
          <ellipse cx="192" cy="120" rx="5" ry="3" fill="#e99985" opacity=".6" />
          {hasHeadphones && (
            <g fill="var(--secondary)" stroke="var(--muted-foreground)" strokeWidth="2">
              <path d="M143 106V95a31 31 0 0 1 62 0v11" fill="none" strokeWidth="5" />
              <rect x="138" y="101" width="10" height="20" rx="5" />
              <rect x="200" y="101" width="10" height="20" rx="5" />
            </g>
          )}
          <circle cx="139" cy="179" r="7" fill="#f4c6a0" />
          <circle cx={isConfident ? "216" : "218"} cy={isConfident ? "119" : "178"} r="7" fill="#f4c6a0" />
        </g>

        <rect x="103" y="182" width="174" height="10" rx="5" fill="#a27b52" />
        <path d="M117 192v54m145-54v54" stroke="#805e3e" strokeWidth="8" strokeLinecap="round" />
        <path d="m160 170 22 4 22-4v13l-22 3-22-3Z" fill="var(--foreground)" />
        <path d="M182 174v12m-17-11 12 2m10 0 12-2" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="112" y="176" width="26" height="6" rx="2" fill="var(--info)" />
        <path d="M116 178h17" stroke="var(--foreground)" opacity=".6" />

        {hasHeadphones && (
          <g>
            <path d="M246 171v-18m0 8q-16-1-15-13 14 0 15 11m1-2q1-12 14-12 0 12-14 13" fill="var(--primary)" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
            <path d="M236 168h20l-3 14h-14Z" fill="var(--warning)" />
          </g>
        )}
        {hasShelf && (
          <g stroke="var(--muted-foreground)" strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M266 176h18m-9-2v-26l-17-18" />
            <path d="m245 126 11-9 15 15-20 8Z" fill="var(--warning)" stroke="var(--warning)" />
          </g>
        )}
        {isConfident && <path d="m230 92 2-6 2 6 6 2-6 2-2 6-2-6-6-2Zm-98-17 1-4 2 4 4 1-4 2-2 4-1-4-4-2Z" fill="var(--warning)" />}
      </svg>

      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-foreground">{stage.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            สะสมแล้ว <span className="font-semibold tabular-nums text-foreground">{activeDays}</span> วัน
            {nextStage ? ` · อีก ${nextStage.minDays - activeDays} วันถึงขั้นถัดไป` : " · เติบโตต่อไปได้ทุกวัน"}
          </p>
        </div>
        <Progress value={progress} aria-label="Stage Progress" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-valuetext={nextStage ? `${nextStage.minDays - activeDays} days until ${nextStage.label}` : "Long-term Growth reached"} />
        <p className="text-xs leading-relaxed text-muted-foreground">ทุกวันที่ได้เรียนรู้มีความหมาย พักได้ แล้วค่อยกลับมาเติบโตต่อ</p>
      </div>

      <style>{`
        @keyframes growth-celebrate {
          0%, 100% { transform: translateY(0) rotate(0); }
          35% { transform: translateY(-7px) rotate(-3deg); }
          70% { transform: translateY(-3px) rotate(3deg); }
        }
        .growth-celebrate { transform-origin: 175px 180px; animation: growth-celebrate 700ms var(--ease-standard) 2; }
        @media (prefers-reduced-motion: reduce) { .growth-celebrate { animation: none; } }
      `}</style>
    </Card>
  )
}
