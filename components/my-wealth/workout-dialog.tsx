"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Trash2, Dumbbell, Flame, Check, Home, Sparkles, Edit3, ChevronDown } from "lucide-react"
import { createWealthWorkout, updateWealthWorkout, deleteWealthWorkout } from "@/app/dashboard/my-wealth/actions"
import { DatePicker } from "@/components/ui/date-picker"
import { formatDateDDMMYYYY } from "@/components/dashboard/format"
import {
  MUSCLE_GROUPS,
  EXERCISES_BY_CATEGORY,
  ROUTINE_PRESETS,
  PresetRoutine,
} from "@/lib/workout-presets"

export interface ExerciseSet {
  set_number: number
  weight_kg: number
  reps: number
  completed: boolean
}

export interface ExerciseItem {
  name: string
  muscle_group: "chest" | "back" | "legs" | "shoulders" | "arms" | "core" | "cardio" | "other"
  sets: ExerciseSet[]
}

export interface WorkoutRecord {
  id: string
  workout_date: string
  title: string
  duration_minutes: number
  notes?: string | null
  exercises: ExerciseItem[]
  total_volume_kg: number | string
  created_at: string
}

interface WorkoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPresetId?: string | null
  initialDate?: string | null
  workoutToEdit?: WorkoutRecord | null
  onSuccess?: () => void
  onDeleteSuccess?: (id: string) => void
}

export function WorkoutDialog({
  open,
  onOpenChange,
  initialPresetId,
  initialDate,
  workoutToEdit,
  onSuccess,
  onDeleteSuccess,
}: WorkoutDialogProps) {
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()
  const isSubmittingRef = useRef(false)

  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"))
  const [title, setTitle] = useState("Home Full Body (ไร้อุปกรณ์)")
  const [duration, setDuration] = useState(30)
  const [notes, setNotes] = useState("")
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(initialPresetId || "home_fullbody")

  const [exercises, setExercises] = useState<ExerciseItem[]>([
    {
      name: "Push-ups (วิดพื้น)",
      muscle_group: "chest",
      sets: [
        { set_number: 1, weight_kg: 0, reps: 12, completed: false },
        { set_number: 2, weight_kg: 0, reps: 10, completed: false },
        { set_number: 3, weight_kg: 0, reps: 8, completed: false },
      ],
    },
    {
      name: "Bodyweight Squats (สควอทบอดี้เวท)",
      muscle_group: "legs",
      sets: [
        { set_number: 1, weight_kg: 0, reps: 15, completed: false },
        { set_number: 2, weight_kg: 0, reps: 15, completed: false },
        { set_number: 3, weight_kg: 0, reps: 12, completed: false },
      ],
    },
  ])

  // Apply preset if selected
  const applyPreset = (preset: PresetRoutine) => {
    setSelectedPresetId(preset.id)
    setTitle(preset.name)
    setDuration(preset.duration)
    setExercises(
      preset.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({ ...s })),
      }))
    )
  }

  // Handle open state & populate fields
  useEffect(() => {
    if (open) {
      if (workoutToEdit) {
        setTitle(workoutToEdit.title)
        setDate(workoutToEdit.workout_date)
        setDuration(workoutToEdit.duration_minutes || 0)
        setNotes(workoutToEdit.notes || "")
        setExercises(
          Array.isArray(workoutToEdit.exercises) && workoutToEdit.exercises.length > 0
            ? workoutToEdit.exercises.map((ex) => ({
                name: ex.name,
                muscle_group: ex.muscle_group as ExerciseItem["muscle_group"],
                sets: ex.sets.map((s) => ({ ...s })),
              }))
            : [{ name: "Push-ups (วิดพื้น)", muscle_group: "chest", sets: [{ set_number: 1, weight_kg: 0, reps: 10, completed: false }] }]
        )
        setSelectedPresetId(null)
      } else {
        if (initialDate) setDate(initialDate)
        const targetId = initialPresetId || "home_fullbody"
        const found = ROUTINE_PRESETS.find((p) => p.id === targetId)
        if (found) {
          applyPreset(found)
        }
      }
    } else {
      isSubmittingRef.current = false
    }
  }, [open, workoutToEdit, initialDate, initialPresetId])

  // Live total volume calculation
  const totalVolume = exercises.reduce((acc, ex) => {
    return acc + ex.sets.reduce((sAcc, s) => sAcc + (s.completed ? s.weight_kg * s.reps : 0), 0)
  }, 0)

  const handleAddExercise = (muscleGroup: ExerciseItem["muscle_group"] = "chest") => {
    const list = EXERCISES_BY_CATEGORY[muscleGroup] || []
    const defaultEx = list[0]?.name || ""
    setExercises((prev) => [
      ...prev,
      {
        name: defaultEx,
        muscle_group: muscleGroup,
        sets: [{ set_number: 1, weight_kg: 0, reps: 10, completed: false }],
      },
    ])
  }

  const handleRemoveExercise = (index: number) => {
    if (exercises.length === 1) return
    setExercises((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateExercise = (index: number, field: keyof ExerciseItem, value: any) => {
    setExercises((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      if (field === "muscle_group") {
        const catList = EXERCISES_BY_CATEGORY[value as string] || []
        if (catList.length > 0 && !copy[index].name) {
          copy[index].name = catList[0].name
        }
      }
      return copy
    })
  }

  const handleAddSet = (exerciseIndex: number) => {
    setExercises((prev) => {
      const copy = [...prev]
      const currentSets = copy[exerciseIndex].sets
      const lastSet = currentSets[currentSets.length - 1]
      const newSet: ExerciseSet = {
        set_number: currentSets.length + 1,
        weight_kg: lastSet ? lastSet.weight_kg : 0,
        reps: lastSet ? lastSet.reps : 10,
        completed: false,
      }
      copy[exerciseIndex].sets = [...currentSets, newSet]
      return copy
    })
  }

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const copy = [...prev]
      if (copy[exerciseIndex].sets.length === 1) return prev
      copy[exerciseIndex].sets = copy[exerciseIndex].sets
        .filter((_, i) => i !== setIndex)
        .map((s, idx) => ({ ...s, set_number: idx + 1 }))
      return copy
    })
  }

  const handleUpdateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof ExerciseSet,
    value: any
  ) => {
    setExercises((prev) => {
      const copy = [...prev]
      const sets = [...copy[exerciseIndex].sets]
      sets[setIndex] = { ...sets[setIndex], [field]: value }
      copy[exerciseIndex].sets = sets
      return copy
    })
  }

  const allSetsCompleted =
    exercises.length > 0 &&
    exercises.every((ex) => Array.isArray(ex.sets) && ex.sets.length > 0 && ex.sets.every((s) => s.completed))

  const toggleAllSetsCompleted = () => {
    const nextState = !allSetsCompleted
    setExercises((prev) =>
      prev.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({ ...s, completed: nextState })),
      }))
    )
  }

  const handleDeleteWorkout = () => {
    if (!workoutToEdit) return
    if (!confirm(`คุณต้องการลบเซสชัน "${workoutToEdit.title}" หรือไม่?`)) return
    startTransition(async () => {
      try {
        await deleteWealthWorkout(workoutToEdit.id)
        toast({ title: "ลบสำเร็จ", description: `ลบเซสชัน "${workoutToEdit.title}" เรียบร้อยแล้ว` })
        onOpenChange(false)
        onDeleteSuccess?.(workoutToEdit.id)
        onSuccess?.()
      } catch (err) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: err instanceof Error ? err.message : "ไม่สามารถลบได้",
          variant: "destructive",
        })
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingRef.current || pending) return

    if (!title.trim()) {
      toast({ title: "ข้อมูลไม่ครบ", description: "กรุณาระบุชื่อ Routine", variant: "destructive" })
      return
    }
    const hasEmptyEx = exercises.some((ex) => !ex.name.trim())
    if (hasEmptyEx) {
      toast({
        title: "ข้อมูลไม่ครบ",
        description: "กรุณากรอกชื่อท่าออกกำลังกายให้ครบถ้วน",
        variant: "destructive",
      })
      return
    }

    isSubmittingRef.current = true

    startTransition(async () => {
      try {
        if (workoutToEdit) {
          await updateWealthWorkout(workoutToEdit.id, {
            workout_date: date,
            title: title.trim(),
            duration_minutes: Number(duration) || 0,
            notes: notes.trim() || undefined,
            exercises,
          })
          toast({
            title: "อัปเดตสำเร็จ",
            description: `แก้ไขการออกกำลังกาย "${title}" เรียบร้อยแล้ว`,
          })
        } else {
          await createWealthWorkout({
            workout_date: date,
            title: title.trim(),
            duration_minutes: Number(duration) || 0,
            notes: notes.trim() || undefined,
            exercises,
          })
          toast({
            title: "บันทึกสำเร็จ",
            description: `บันทึกการออกกำลังกาย "${title}" เรียบร้อยแล้ว`,
          })
        }
        onOpenChange(false)
        onSuccess?.()
      } catch (err) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: err instanceof Error ? err.message : "ไม่สามารถบันทึกได้",
          variant: "destructive",
        })
      } finally {
        isSubmittingRef.current = false
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-white/10 text-white shadow-2xl">
        <DialogHeader className="p-4 pb-3 border-b border-white/10 shrink-0 pr-10">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/20 p-1.5 text-primary">
              {workoutToEdit ? <Edit3 className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white">
                {workoutToEdit ? `แก้ไขเซสชัน: ${workoutToEdit.title}` : "บันทึกการออกกำลังกาย"}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-spotify-muted">
                {workoutToEdit
                  ? `วันที่ ${formatDateDDMMYYYY(workoutToEdit.workout_date)} · แก้ไขท่า น้ำหนัก และจำนวนครั้ง`
                  : "เลือกพรีเซ็ตไร้อุปกรณ์หรือกำหนดท่าตามกลุ่มกล้ามเนื้อ"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Body: Presets, Session Info, Exercises List & Notes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
            {/* Routine Presets Dropdown (Hide when editing existing workout) */}
            {!workoutToEdit && (
            <div className="rounded-lg border border-white/10 bg-background/80 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="preset-select"
                  className="text-xs font-bold text-white flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>เลือกโปรแกรมพรีเซ็ต (Preset Routine):</span>
                </label>
                <span className="text-[11px] text-spotify-muted">
                  {ROUTINE_PRESETS.length} โปรแกรม
                </span>
              </div>

              {/* Styled Dropdown Selector */}
              <div className="relative">
                <select
                  id="preset-select"
                  value={selectedPresetId || ""}
                  onChange={(e) => {
                    const preset = ROUTINE_PRESETS.find((p) => p.id === e.target.value)
                    if (preset) applyPreset(preset)
                  }}
                  className="w-full rounded-lg bg-[#222222] border border-white/15 px-3 py-2 pr-9 text-xs font-semibold text-white focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    -- เลือกพรีเซ็ตสำเร็จรูป (หรือกำหนดท่าเอง) --
                  </option>
                  <optgroup label="🏠 ออกกำลังกายที่บ้าน (ไร้อุปกรณ์)">
                    {ROUTINE_PRESETS.filter((p) => p.category === "home").map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.duration} นาที
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🏋️ ยิมและเวทเทรนนิ่ง (มีอุปกรณ์)">
                    {ROUTINE_PRESETS.filter((p) => p.category === "gym").map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.duration} นาที
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="⚡ โปรแกรมด่วน 10-15 นาที">
                    {ROUTINE_PRESETS.filter((p) => p.category === "quick").map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.duration} นาที
                      </option>
                    ))}
                  </optgroup>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-spotify-muted">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>

              {/* Active Preset Detail Strip */}
              {selectedPresetId && (
                (() => {
                  const activePreset = ROUTINE_PRESETS.find((p) => p.id === selectedPresetId)
                  if (!activePreset) return null
                  return (
                    <div className="rounded bg-[#1a1a1a] border border-white/5 px-2.5 py-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-spotify-muted truncate mr-2">
                        {activePreset.description}
                      </span>
                      <span className="text-primary font-bold shrink-0">
                        {activePreset.exercises.length} ท่า · {activePreset.duration} นาที
                      </span>
                    </div>
                  )
                })()
              )}
            </div>
          )}

          {/* Session Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-spotify-muted font-medium mb-0.5 block">
                ชื่อ Routine
              </label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setSelectedPresetId(null)
                }}
                placeholder="เช่น Home Full Body"
                className="bg-surface-hover border-white/10 text-white text-xs h-7"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-spotify-muted font-medium mb-0.5 block">
                วันที่
              </label>
              <DatePicker
                defaultValue={date}
                value={
                  (() => {
                    if (!date) return undefined
                    const parts = date.slice(0, 10).split("-")
                    if (parts.length === 3 && parts[0].length === 4) {
                      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
                    }
                    const d = new Date(date)
                    return isNaN(d.getTime()) ? undefined : d
                  })()
                }
                onChange={(selectedDate) => {
                  if (selectedDate) {
                    const y = selectedDate.getFullYear()
                    const m = String(selectedDate.getMonth() + 1).padStart(2, "0")
                    const d = String(selectedDate.getDate()).padStart(2, "0")
                    setDate(`${y}-${m}-${d}`)
                  }
                }}
                className="bg-surface-hover border-white/10 text-white text-xs h-7 px-2 font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] text-spotify-muted font-medium mb-0.5 block">
                ระยะเวลา (นาที)
              </label>
              <Input
                type="number"
                min="0"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="bg-surface-hover border-white/10 text-white text-xs h-7"
              />
            </div>
          </div>

          {/* Exercises Block */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-spotify-muted">
                รายการท่าออกกำลังกาย ({exercises.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAllSetsCompleted}
                  className="h-6 px-2 rounded text-[11px] font-semibold text-primary hover:text-white hover:bg-white/5 flex items-center gap-1 border border-primary/30 transition-colors"
                >
                  <Check className="h-3 w-3 stroke-[2.5]" />
                  {allSetsCompleted ? "ยกเลิกติ๊กทั้งหมด" : "ติ๊กสำเร็จทั้งหมด"}
                </button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddExercise("chest")}
                  className="h-6 text-[11px] border-white/10 bg-white/5 text-white hover:bg-white/10 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Exercise
                </Button>
              </div>
            </div>

            {exercises.map((ex, exIdx) => {
              const suggestedExercises = EXERCISES_BY_CATEGORY[ex.muscle_group] || []
              const datalistId = `exercises-list-${exIdx}`

              return (
                <div
                  key={exIdx}
                  className="rounded-lg border border-white/5 bg-secondary p-2.5 space-y-2"
                >
                  {/* Exercise header & category select */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold text-white shrink-0">
                        {exIdx + 1}
                      </span>

                      {/* Muscle group dropdown */}
                      <select
                        value={ex.muscle_group}
                        onChange={(e) =>
                          handleUpdateExercise(exIdx, "muscle_group", e.target.value)
                        }
                        className="h-7 rounded bg-surface-hover border border-white/10 text-white text-[11px] px-1.5 shrink-0 outline-none font-medium"
                      >
                        {MUSCLE_GROUPS.map((m) => (
                          <option key={m.value} value={m.value} className="bg-secondary">
                            {m.label}
                          </option>
                        ))}
                      </select>

                      {/* Exercise Name Input with HTML5 Datalist */}
                      <div className="relative flex-1">
                        <Input
                          list={datalistId}
                          value={ex.name}
                          onChange={(e) =>
                            handleUpdateExercise(exIdx, "name", e.target.value)
                          }
                          placeholder="พิมพ์หรือเลือกท่า เช่น Push-ups..."
                          className="bg-surface-hover border-white/10 text-white text-xs h-7 w-full"
                        />
                        <datalist id={datalistId}>
                          {suggestedExercises.map((sEx, i) => (
                            <option key={i} value={sEx.name}>
                              {sEx.isBodyweight ? "🏠 ไร้อุปกรณ์" : "🏋️ อุปกรณ์"}
                            </option>
                          ))}
                        </datalist>
                      </div>
                    </div>

                    {exercises.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExercise(exIdx)}
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0 self-end sm:self-center"
                        title="ลบท่านี้"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Quick Select Suggested Pills for this Category */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                    <span className="text-[9px] text-spotify-muted shrink-0">
                      แนะนำ:
                    </span>
                    {suggestedExercises.slice(0, 5).map((sEx, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleUpdateExercise(exIdx, "name", sEx.name)}
                        className={`rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors shrink-0 ${
                          ex.name === sEx.name
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "bg-surface-hover text-spotify-muted hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {sEx.isBodyweight ? "🏠 " : ""}{sEx.name}
                      </button>
                    ))}
                  </div>

                  {/* Sets Header */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-12 gap-1.5 text-[9px] font-semibold text-spotify-muted uppercase px-1">
                      <span className="col-span-2">เซ็ต</span>
                      <span className="col-span-4">น้ำหนัก (kg)</span>
                      <span className="col-span-3">ครั้ง (Reps)</span>
                      <span className="col-span-2 text-center">สำเร็จ</span>
                      <span className="col-span-1"></span>
                    </div>

                    {/* Sets Rows */}
                    {ex.sets.map((set, sIdx) => (
                      <div
                        key={sIdx}
                        className="grid grid-cols-12 gap-1.5 items-center bg-surface-hover/60 p-1 rounded border border-white/5"
                      >
                        <span className="col-span-2 text-[11px] font-bold text-center text-white/80">
                          #{set.set_number}
                        </span>
                        <div className="col-span-4">
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            value={set.weight_kg}
                            onChange={(e) =>
                              handleUpdateSet(
                                exIdx,
                                sIdx,
                                "weight_kg",
                                Number(e.target.value)
                              )
                            }
                            placeholder="0 = บอดี้เวท"
                            className="h-6 bg-[#1c1c1c] border-white/10 text-white text-[11px] px-1.5"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            min="0"
                            value={set.reps}
                            onChange={(e) =>
                              handleUpdateSet(
                                exIdx,
                                sIdx,
                                "reps",
                                Number(e.target.value)
                              )
                            }
                            className="h-6 bg-[#1c1c1c] border-white/10 text-white text-[11px] px-1.5"
                          />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSet(
                                exIdx,
                                sIdx,
                                "completed",
                                !set.completed
                              )
                            }
                            className={`h-5 w-5 rounded flex items-center justify-center transition-colors ${
                              set.completed
                                ? "bg-primary text-black"
                                : "bg-white/10 text-white/40 hover:bg-white/20"
                            }`}
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                          </button>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          {ex.sets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSet(exIdx, sIdx)}
                              className="text-white/30 hover:text-red-400 p-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleAddSet(exIdx)}
                        className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-2.5 w-2.5" /> Add Set
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-spotify-muted font-medium mb-0.5 block">
              บันทึกเพิ่มเติม (Notes)
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ความรู้สึกล้า, สภาพร่างกาย, ฝึกที่บ้าน..."
              className="bg-surface-hover border-white/10 text-white text-xs h-7"
            />
          </div>

          </div>

          {/* Sticky Footer: Live Volume Summary and Action Buttons (Always Visible) */}
          <div className="shrink-0 p-3 px-4 border-t border-white/10 bg-background flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-spotify-muted">Total Volume:</span>
              <span className="text-xs sm:text-sm font-extrabold text-white tabular-nums">
                {totalVolume.toLocaleString()}{" "}
                <span className="text-[11px] font-normal text-spotify-muted">
                  kg {totalVolume === 0 && "(บอดี้เวท)"}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {workoutToEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={handleDeleteWorkout}
                  className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2.5"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs text-spotify-muted hover:text-white h-8 px-3"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={pending}
                className={cn(
                  "bg-primary text-black hover:bg-primary/90 font-bold text-xs h-8 px-4 shadow-sm shadow-primary/20",
                  pending && "opacity-50 pointer-events-none cursor-not-allowed"
                )}
              >
                {pending
                  ? "Saving..."
                  : workoutToEdit
                  ? "Save Changes"
                  : "Save Workout"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
