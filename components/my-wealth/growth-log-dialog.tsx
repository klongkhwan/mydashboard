"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { createGrowthLog, updateGrowthLog } from "@/app/dashboard/my-wealth/growth/actions"
import { growthLogSchema } from "@/app/dashboard/my-wealth/growth/schema"
import { GROWTH_CATEGORIES, getGrowthToday, type GrowthCategory, type GrowthLog } from "@/lib/personal-growth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface GrowthLogDialogProps {
  log: GrowthLog | null
  initialDate: string
  onClose: () => void
  onSaved: (log: GrowthLog) => void
  onCloseAutoFocus: (event: Event) => void
}

export function GrowthLogDialog({ log, initialDate, onClose, onSaved, onCloseAutoFocus }: GrowthLogDialogProps) {
  const [date, setDate] = useState(log?.activity_date ?? initialDate)
  const [category, setCategory] = useState<GrowthCategory>(log?.category ?? "reading")
  const [title, setTitle] = useState(log?.title ?? "")
  const [minutes, setMinutes] = useState(log?.duration_minutes?.toString() ?? "")
  const [notes, setNotes] = useState(log?.notes ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState("")
  const [pending, setPending] = useState(false)
  const submitting = useRef(false)
  const errorSummary = useRef<HTMLParagraphElement>(null)

  useEffect(() => { if (saveError) errorSummary.current?.focus() }, [saveError])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const result = growthLogSchema.safeParse({
      activity_date: date, category, title, duration_minutes: minutes, notes,
    })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message
      setErrors(fieldErrors)
      event.currentTarget.querySelector<HTMLElement>(`[id="growth-${Object.keys(fieldErrors)[0]}"]`)?.focus()
      return
    }
    setErrors({})
    setSaveError("")
    submitting.current = true
    setPending(true)
    try {
      const saved = log ? await updateGrowthLog(log.id, result.data) : await createGrowthLog(result.data)
      onSaved(saved)
      toast.success(log ? "Activity Updated" : "Activity Saved")
      onClose()
    } catch {
      setSaveError("บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองอีกครั้ง")
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  function fieldError(field: string) {
    return errors[field] ? <p id={`growth-${field}-error`} role="alert" className="text-sm text-destructive">{errors[field]}</p> : null
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !submitting.current) onClose() }}>
      <DialogContent showCloseButton={!pending} onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>{log ? "Edit Activity" : "Log Activity"}</DialogTitle>
          <DialogDescription>วันนี้คุณได้เรียนรู้อะไรบ้าง? บันทึกเฉพาะสิ่งที่ลงมือทำแล้ว</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit} className="space-y-4" aria-busy={pending}>
          <fieldset disabled={pending} className="min-w-0 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="growth-activity_date">Date <span className="text-muted-foreground">(Bangkok)</span></Label>
                <DatePicker id="growth-activity_date" required disabled={pending}
                  value={new Date(`${date}T00:00:00`)} maxDate={new Date(`${getGrowthToday()}T00:00:00`)}
                  onChange={selected => { if (selected) setDate(format(selected, "yyyy-MM-dd")) }}
                  className="text-base md:text-sm" aria-invalid={!!errors.activity_date}
                  aria-describedby={errors.activity_date ? "growth-activity_date-error" : undefined} />
                {fieldError("activity_date")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="growth-category">Category</Label>
                <Select value={category} onValueChange={value => setCategory(value as GrowthCategory)} disabled={pending}>
                  <SelectTrigger id="growth-category" className="w-full text-base md:text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{GROWTH_CATEGORIES.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="growth-title">Activity Title <span className="text-muted-foreground">(required)</span></Label>
              <Input id="growth-title" required maxLength={200} value={title} autoFocus placeholder="เช่น อ่าน Atomic Habits บทที่ 2"
                onChange={event => setTitle(event.target.value)} aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "growth-title-error" : undefined} />
              {fieldError("title")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="growth-duration_minutes">Duration (minutes) <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="growth-duration_minutes" type="number" inputMode="numeric" min={1} max={1440} step={1} value={minutes}
                placeholder="เช่น 20" onChange={event => setMinutes(event.target.value)} aria-invalid={!!errors.duration_minutes}
                aria-describedby={errors.duration_minutes ? "growth-duration_minutes-error" : undefined} />
              {fieldError("duration_minutes")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="growth-notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea id="growth-notes" value={notes} maxLength={2000} rows={3} placeholder="จดสิ่งที่อยากจำไว้สั้น ๆ"
                onChange={event => setNotes(event.target.value)} aria-invalid={!!errors.notes}
                aria-describedby={errors.notes ? "growth-notes-error" : undefined} />
              {fieldError("notes")}
            </div>
          </fieldset>
          {saveError && <p ref={errorSummary} tabIndex={-1} role="alert" className="text-sm text-destructive">{saveError}</p>}
          <DialogFooter>
            <Button type="button" variant="pill-secondary" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" variant="pill" disabled={pending} aria-busy={pending}>{pending ? "Saving..." : log ? "Save Changes" : "Save Activity"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
