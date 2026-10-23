"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import {
  Dumbbell,
  Plus,
  Flame,
  Calendar,
  Clock,
  Trash2,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Home,
  Edit3,
  History,
  Scale,
} from "lucide-react"
import { WorkoutDialog, WorkoutRecord } from "@/components/my-wealth/workout-dialog"
import { WorkoutActivityHeatmap } from "@/components/my-wealth/workout-activity-heatmap"
import { MuscleMap } from "@/components/my-wealth/muscle-map"
import { getMyWorkouts, deleteWealthWorkout } from "@/app/dashboard/my-wealth/actions"
import {
  ROUTINE_PRESETS,
  calculateWeekStreak,
  calculate30dVolume,
  isWorkoutCompleted,
} from "@/lib/workout-presets"
import { formatDateDDMMYYYY } from "@/components/dashboard/format"

const MUSCLE_BADGES: Record<string, { label: string; color: string }> = {
  chest: { label: "อก", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  back: { label: "หลัง", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  legs: { label: "ขา", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  shoulders: { label: "ไหล่", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  arms: { label: "แขน", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  core: { label: "แกนกลาง", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  cardio: { label: "คาร์ดิโอ", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  other: { label: "อื่นๆ", color: "bg-white/10 text-white/60 border-white/10" },
}

export default function WorkoutsPage() {
  const { toast } = useToast()
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"stats" | "history">("stats")
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>("home_fullbody")
  const [workoutToEdit, setWorkoutToEdit] = useState<WorkoutRecord | null>(null)
  const [initialDate, setInitialDate] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleOpenPreset = (presetId: string) => {
    setWorkoutToEdit(null)
    setInitialDate(null)
    setSelectedPresetId(presetId)
    setDialogOpen(true)
  }

  const handleOpenCreate = (dateStr?: string) => {
    const targetDate = dateStr || new Date().toLocaleDateString("en-CA")
    setWorkoutToEdit(null)
    setInitialDate(targetDate)
    setSelectedPresetId("home_fullbody")
    setDialogOpen(true)
  }

  const handleOpenEdit = (workout: WorkoutRecord) => {
    setWorkoutToEdit(workout)
    setInitialDate(null)
    setDialogOpen(true)
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getMyWorkouts()
      setWorkouts(data as WorkoutRecord[])
    } catch (err) {
      console.error(err)
      toast({
        title: "โหลดข้อมูลไม่สำเร็จ",
        description: "ไม่สามารถดึงประวัติการออกกำลังกายได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`คุณต้องการลบเซสชัน "${title}" หรือไม่?`)) return
    startTransition(async () => {
      try {
        await deleteWealthWorkout(id)
        toast({ title: "ลบสำเร็จ", description: `ลบเซสชัน "${title}" เรียบร้อยแล้ว` })
        setWorkouts((prev) => prev.filter((w) => w.id !== id))
        if (workoutToEdit?.id === id) {
          setWorkoutToEdit(null)
          setDialogOpen(false)
        }
      } catch (err) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: err instanceof Error ? err.message : "ไม่สามารถลบได้",
          variant: "destructive",
        })
      }
    })
  }

  // Aggregate Stats strictly from completed sessions
  const completedWorkouts = workouts.filter(isWorkoutCompleted)
  const totalWorkouts = completedWorkouts.length
  const currentMonthPrefix = new Date().toISOString().slice(0, 7)
  const thisMonthWorkouts = completedWorkouts.filter((w) =>
    w.workout_date?.startsWith(currentMonthPrefix)
  ).length
  const weekStreak = calculateWeekStreak(completedWorkouts)
  const volume30d = calculate30dVolume(completedWorkouts)

  return (
    <div className="space-y-4 max-w-[1500px] mx-auto pb-4">
      {/* Header Bar matching reference screenshot */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Stats</h1>
          <p className="text-xs text-spotify-muted">Progress & history</p>
        </div>

        <div className="flex items-center gap-2">
          {/* History Toggle Button */}
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === "stats" ? "history" : "stats")}
            className={`h-8 px-2.5 rounded-full flex items-center gap-1.5 border transition-all text-xs font-bold ${
              activeTab === "history"
                ? "bg-primary text-black border-primary"
                : "bg-[#1c1c1c] border-white/10 text-spotify-muted hover:text-white"
            }`}
            title="สลับดูประวัติการเล่น (History)"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{activeTab === "history" ? "Stats" : "History"}</span>
          </button>

          <Button
            size="sm"
            onClick={() => handleOpenCreate()}
            className="h-8 bg-primary text-black hover:bg-primary/90 font-bold text-xs shadow-sm shadow-primary/20 px-3"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Log Workout
          </Button>
        </div>
      </div>

      {/* TAB CONTENT (No extra top menu tabs) */}
      {activeTab === "stats" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* LEFT COLUMN (6 cols): 2x2 Stats Cards + Activity Heatmap */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* 2x2 Stats Cards (matching openGym style - Scaled Up) */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Card 1: Workouts */}
              <div className="rounded-xl border border-white/5 bg-[#141414] p-5 sm:p-6 flex flex-col justify-between transition-all hover:border-white/10">
                <div className="flex items-center gap-2 text-spotify-muted text-xs sm:text-sm font-semibold">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  <span>Workouts</span>
                </div>
                <div className="mt-3">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight tabular-nums">
                    {totalWorkouts}
                  </div>
                  <span className="text-[11px] font-medium text-spotify-muted/80">เซสชันทั้งหมด</span>
                </div>
              </div>

              {/* Card 2: This month */}
              <div className="rounded-xl border border-white/5 bg-[#141414] p-5 sm:p-6 flex flex-col justify-between transition-all hover:border-white/10">
                <div className="flex items-center gap-2 text-spotify-muted text-xs sm:text-sm font-semibold">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <span>This month</span>
                </div>
                <div className="mt-3">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight tabular-nums">
                    {thisMonthWorkouts}
                  </div>
                  <span className="text-[11px] font-medium text-spotify-muted/80">เซสชันเดือนนี้</span>
                </div>
              </div>

              {/* Card 3: Week streak */}
              <div className="rounded-xl border border-white/5 bg-[#141414] p-5 sm:p-6 flex flex-col justify-between transition-all hover:border-white/10">
                <div className="flex items-center gap-2 text-spotify-muted text-xs sm:text-sm font-semibold">
                  <Flame className="h-4 w-4 text-amber-400" />
                  <span>Week streak</span>
                </div>
                <div className="mt-3">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight tabular-nums">
                    {weekStreak}
                  </div>
                  <span className="text-[11px] font-medium text-spotify-muted/80">สัปดาห์ต่อเนื่อง</span>
                </div>
              </div>

              {/* Card 4: Volume 30d */}
              <div className="rounded-xl border border-white/5 bg-[#141414] p-5 sm:p-6 flex flex-col justify-between transition-all hover:border-white/10">
                <div className="flex items-center gap-2 text-spotify-muted text-xs sm:text-sm font-semibold">
                  <Scale className="h-4 w-4 text-[#22c55e]" />
                  <span>Volume 30d</span>
                </div>
                <div className="mt-3">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#22c55e] tracking-tight tabular-nums truncate">
                    {volume30d > 0 ? `+${(volume30d / 1000).toFixed(1)}k` : "0"}{" "}
                    <span className="text-xs sm:text-sm font-bold text-spotify-muted">kg</span>
                  </div>
                  <span className="text-[11px] font-medium text-spotify-muted/80">น้ำหนักรวมยก 30 วัน</span>
                </div>
              </div>
            </div>

            {/* Activity Heatmap Card */}
            <div className="flex-1 flex flex-col">
              <WorkoutActivityHeatmap
                workouts={workouts}
                onSelectWorkout={(w) => handleOpenEdit(w as WorkoutRecord)}
                onSelectEmptyDate={(dateStr) => handleOpenCreate(dateStr)}
                className="h-full"
              />
            </div>
          </div>

          {/* RIGHT COLUMN (6 cols): Muscle Map */}
          <div className="lg:col-span-6 flex flex-col">
            {/* Muscle Map (Front & Back Body Anatomical Map) */}
            <MuscleMap workouts={workouts} className="h-full" />
          </div>
        </div>
      ) : (
        /* HISTORY TAB CONTENT */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("stats")}
                className="h-7 text-xs border-white/10 bg-[#1c1c1c] text-white hover:bg-white/10"
              >
                ← กลับไปหน้า Stats
              </Button>
              <h2 className="text-xs font-bold uppercase tracking-wider text-spotify-muted">
                ประวัติการออกกำลังกายทั้งหมด ({workouts.length} รายการ)
              </h2>
            </div>
            <Button
              size="sm"
              onClick={() => handleOpenCreate()}
              className="h-7 bg-primary text-black font-bold text-xs px-2.5"
            >
              <Plus className="mr-1 h-3 w-3" /> New Workout
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {workouts.map((workout) => {
              const exercisesList = Array.isArray(workout.exercises) ? workout.exercises : []

              return (
                <div
                  key={workout.id}
                  onClick={() => handleOpenEdit(workout)}
                  className="group rounded-xl border border-white/5 bg-[#141414] hover:border-primary/40 hover:bg-card p-3.5 transition-all shadow-sm cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                        {workout.title}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-spotify-muted shrink-0">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateDDMMYYYY(workout.workout_date)}
                        </span>
                        {workout.duration_minutes > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {workout.duration_minutes} นาที
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                        <Flame className="h-3.5 w-3.5" />
                        <span>{Number(workout.total_volume_kg).toLocaleString()} kg</span>
                      </div>
                      <span className="h-6 w-6 rounded flex items-center justify-center text-white/30 group-hover:text-primary transition-colors">
                        <Edit3 className="h-3.5 w-3.5" />
                      </span>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(workout.id, workout.title)
                        }}
                        className="h-6 w-6 rounded flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="ลบเซสชัน"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {exercisesList.map((ex, exIdx) => {
                        const badge = MUSCLE_BADGES[ex.muscle_group] || MUSCLE_BADGES.other
                        const completedCount = ex.sets.filter((s) => s.completed).length

                        return (
                          <div
                            key={exIdx}
                            className="flex items-center gap-1.5 rounded bg-[#1c1c1c] border border-white/5 px-2 py-0.5 text-xs"
                          >
                            <span className={`rounded text-[9px] font-bold px-1 py-0.2 border ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="font-semibold text-white/90">{ex.name}</span>
                            <span className="text-spotify-muted text-[10px]">
                              ({completedCount}/{ex.sets.length} เซ็ต)
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {workout.notes && (
                      <p className="text-[11px] italic text-spotify-muted pt-1">
                        โน้ต: {workout.notes}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Workout Dialog (Unified for Create & Edit) */}
      <WorkoutDialog
        open={dialogOpen}
        onOpenChange={(isOpen) => {
          setDialogOpen(isOpen)
          if (!isOpen) {
            setWorkoutToEdit(null)
            setInitialDate(null)
          }
        }}
        initialPresetId={selectedPresetId}
        initialDate={initialDate}
        workoutToEdit={workoutToEdit}
        onSuccess={loadData}
        onDeleteSuccess={(deletedId) => {
          setWorkouts((prev) => prev.filter((w) => w.id !== deletedId))
        }}
      />
    </div>
  )
}
