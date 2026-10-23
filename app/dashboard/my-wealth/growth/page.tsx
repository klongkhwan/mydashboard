"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { BookOpen, CalendarDays, ChartNoAxesCombined, Check, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { getMyGrowthLogs, deleteGrowthLog } from "./actions"
import { GROWTH_CATEGORIES, GROWTH_STAGES, calculateGrowthStats, getGrowthStage, getGrowthToday, type GrowthLog } from "@/lib/personal-growth"
import { formatDateDDMMYYYY } from "@/components/dashboard/format"
import { GrowthCharacter } from "@/components/my-wealth/growth-character"
import { GrowthActivityHeatmap } from "@/components/my-wealth/growth-activity-heatmap"
import { GrowthLogDialog } from "@/components/my-wealth/growth-log-dialog"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export default function GrowthPage() {
  const [logs, setLogs] = useState<GrowthLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [today, setToday] = useState(getGrowthToday)
  const [editor, setEditor] = useState<{ log: GrowthLog | null; date: string } | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<GrowthLog | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const [celebrationKey, setCelebrationKey] = useState(0)
  const [activeTab, setActiveTab] = useState("overview")
  const deleteInFlight = useRef(false)
  const mainAction = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const deleteErrorSummary = useRef<HTMLParagraphElement>(null)

  const loadData = useCallback(() => getMyGrowthLogs()
    .then(data => {
      setLogs(data)
      setToday(getGrowthToday())
    })
    .catch(() => setLoadError(true))
    .finally(() => setLoading(false)), [])

  useEffect(() => { void loadData() }, [loadData])
  useEffect(() => {
    const updateToday = () => setToday(getGrowthToday())
    const timer = window.setInterval(updateToday, 30_000)
    window.addEventListener("focus", updateToday)
    return () => { window.clearInterval(timer); window.removeEventListener("focus", updateToday) }
  }, [])
  useEffect(() => {
    if (!celebrationKey) return
    const timer = window.setTimeout(() => setCelebrationKey(0), 1500)
    return () => window.clearTimeout(timer)
  }, [celebrationKey])
  useEffect(() => { if (deleteError) deleteErrorSummary.current?.focus() }, [deleteError])

  const stats = calculateGrowthStats(logs, today)
  const dayLogs = logs.filter(log => log.activity_date === selectedDate)

  function rememberOpener() {
    const element = document.activeElement
    if (element instanceof HTMLElement && !element.closest('[role="dialog"], [role="alertdialog"]')) opener.current = element
  }

  function restoreFocus(event: Event) {
    event.preventDefault()
    // A day list can hand focus directly to the editor or delete confirmation.
    if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return
    const target = opener.current?.isConnected ? opener.current : mainAction.current
    target?.focus()
  }

  function openCreate(date = getGrowthToday()) {
    rememberOpener()
    setSelectedDate(null)
    setEditor({ log: null, date })
  }

  function handleSaved(saved: GrowthLog) {
    const nextLogs = [saved, ...logs.filter(log => log.id !== saved.id)].sort((a, b) =>
      b.activity_date.localeCompare(a.activity_date) || b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
    )
    const freshToday = getGrowthToday()
    const before = calculateGrowthStats(logs, freshToday)
    const after = calculateGrowthStats(nextLogs, freshToday)
    setLogs(nextLogs)
    setToday(freshToday)
    if (after.activeDays > before.activeDays) {
      setActiveTab("overview")
      setCelebrationKey(key => key + 1)
      const oldStage = getGrowthStage(before.activeDays)
      const newStage = getGrowthStage(after.activeDays)
      if (newStage > oldStage) toast.success(`New Stage: ${GROWTH_STAGES[newStage].label}`, { description: `คุณพัฒนาตัวเองสะสมแล้ว ${after.activeDays} วัน` })
    }
  }

  async function handleDelete() {
    if (!toDelete || deleteInFlight.current) return
    deleteInFlight.current = true
    setDeleting(true)
    setDeleteError(false)
    try {
      await deleteGrowthLog(toDelete.id)
      setLogs(previous => previous.filter(log => log.id !== toDelete.id))
      setToDelete(null)
      toast.success("Activity Deleted")
    } catch {
      setDeleteError(true)
    } finally {
      deleteInFlight.current = false
      setDeleting(false)
    }
  }

  function renderLogs(items: GrowthLog[]) {
    return <ul className="space-y-3" aria-label="Activities">
      {items.map(log => <li key={log.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-border bg-card p-4">
        <div className="mt-1 rounded-lg bg-primary/10 p-2 text-primary" aria-hidden="true"><BookOpen className="size-4" /></div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs text-muted-foreground"><span className="font-medium">{GROWTH_CATEGORIES.find(item => item.value === log.category)?.label}</span> · <span className="tabular-nums">{formatDateDDMMYYYY(log.activity_date)}{log.duration_minutes != null && ` · ${log.duration_minutes} min`}</span></p>
          <p className="break-words text-sm font-medium">{log.title}</p>
          {log.notes && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{log.notes}</p>}
        </div>
        <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
          <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" aria-label={`Edit ${log.title}`} onClick={() => { rememberOpener(); setSelectedDate(null); setEditor({ log, date: log.activity_date }) }}><Pencil className="size-4" /></Button></TooltipTrigger><TooltipContent>Edit Activity</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" aria-label={`Delete ${log.title}`} onClick={() => { rememberOpener(); setDeleteError(false); setSelectedDate(null); setToDelete(log) }}><Trash2 className="size-4" /></Button></TooltipTrigger><TooltipContent>Delete Activity</TooltipContent></Tooltip>
        </div>
      </li>)}
    </ul>
  }

  return <div className="mx-auto max-w-[1500px] space-y-8 pb-4">
    <PageHeader eyebrow="Personal Development" title="Personal Growth"
      description="ทุกวันที่ลงมือทำ คือการลงทุนในตัวเอง"
      action={<Button variant="pill" ref={mainAction} onClick={() => openCreate()} disabled={loading || loadError}><Plus className="size-4" />Log Activity</Button>} />

    {loading ? <div role="status" className="py-16 text-center text-sm text-muted-foreground">Loading Activities...</div>
      : loadError ? <Card><CardContent className="space-y-4 py-12 text-center">
        <h2 className="text-sm font-semibold">Unable to Load Activities</h2>
        <p role="alert">โหลดกิจกรรมไม่สำเร็จ กรุณาลองอีกครั้ง</p>
        <Button variant="pill-secondary" onClick={() => { setLoading(true); setLoadError(false); void loadData() }}><RefreshCw className="size-4" />Try Again</Button>
      </CardContent></Card>
      : <Tabs value={activeTab} onValueChange={value => { setActiveTab(value); setCelebrationKey(0) }} className="gap-4">
        <TabsList aria-label="Personal Growth views">
          <TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="history">History ({logs.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
              <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
                {[
                  { label: "Active Days", value: stats.activeDays, unit: "days", icon: ChartNoAxesCombined },
                  { label: "This Month", value: stats.monthDays, unit: "days", icon: CalendarDays },
                  { label: "Last 7 Days", value: stats.last7Days, unit: "days", icon: Check },
                  { label: "Activities", value: stats.totalActivities, unit: "activities", icon: BookOpen },
                ].map(item => <Card key={item.label} className="gap-0 py-0"><CardContent className="space-y-4 p-4 sm:p-6">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"><item.icon className="size-4 shrink-0 text-primary" />{item.label}</p>
                  <p className="flex flex-wrap items-baseline gap-x-2 text-3xl font-black tracking-tight tabular-nums sm:text-4xl">{item.value}<span className="text-xs font-normal text-muted-foreground">{item.unit}</span></p>
                </CardContent></Card>)}
              </div>
              <GrowthActivityHeatmap logs={logs} today={today} onSelectDate={date => {
                if (logs.some(log => log.activity_date === date)) { rememberOpener(); setSelectedDate(date) }
                else openCreate(date)
              }} className="flex-1" />
            </div>
            <div className="order-1 min-w-0 lg:order-2"><GrowthCharacter activeDays={stats.activeDays} celebrationKey={celebrationKey} /></div>
          </div>
          {logs.length === 0 && <Card><CardContent className="space-y-3 py-8 text-center">
            <h2 className="text-sm font-semibold">Start Your Growth</h2>
            <p className="text-sm text-muted-foreground">อ่านหนึ่งบท ฟังหนึ่งตอน หรือฝึกทักษะสักนิด ทุกวันที่ลงมือทำมีความหมาย</p>
            <Button variant="pill" onClick={() => openCreate()}><Plus className="size-4" />Log First Activity</Button>
          </CardContent></Card>}
        </TabsContent>
        <TabsContent value="history">
          {logs.length ? <section className="space-y-4" aria-label="Activity History"><h2 className="text-sm font-semibold">Activity History</h2>{renderLogs(logs)}</section> : <Card><CardContent className="space-y-3 py-12 text-center"><h2 className="text-sm font-semibold">No Activities Yet</h2><p className="text-sm text-muted-foreground">ยังไม่มีกิจกรรมที่บันทึกไว้ เริ่มได้จากปุ่ม “Log Activity”</p></CardContent></Card>}
        </TabsContent>
      </Tabs>}

    <Dialog open={selectedDate !== null} onOpenChange={open => { if (!open) setSelectedDate(null) }}>
      <DialogContent onCloseAutoFocus={restoreFocus}>
        <DialogHeader><DialogTitle>Activities · <span className="tabular-nums">{formatDateDDMMYYYY(selectedDate)}</span></DialogTitle>
          <DialogDescription>{dayLogs.length} activities · นับเป็นวันพัฒนา 1 วัน</DialogDescription></DialogHeader>
        {renderLogs(dayLogs)}
        <Button variant="pill" onClick={() => { if (selectedDate) openCreate(selectedDate) }}><Plus className="size-4" />Add Activity</Button>
      </DialogContent>
    </Dialog>

    {editor && <GrowthLogDialog log={editor.log} initialDate={editor.date} onClose={() => setEditor(null)} onSaved={handleSaved} onCloseAutoFocus={restoreFocus} />}

    <AlertDialog open={toDelete !== null} onOpenChange={open => { if (!open && !deleteInFlight.current) setToDelete(null) }}>
      <AlertDialogContent onCloseAutoFocus={restoreFocus}>
        <AlertDialogHeader><AlertDialogTitle>Delete Activity?</AlertDialogTitle>
          <AlertDialogDescription>“{toDelete?.title}” จะถูกลบ หากเป็นกิจกรรมสุดท้ายของวัน วันสะสมและขั้นของคุณจะคำนวณใหม่</AlertDialogDescription></AlertDialogHeader>
        {deleteError && <p ref={deleteErrorSummary} tabIndex={-1} role="alert" className="text-sm text-destructive">ลบไม่สำเร็จ กิจกรรมยังอยู่ กรุณาลองอีกครั้ง</p>}
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full text-xs font-bold uppercase tracking-wider" disabled={deleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" size="pill" disabled={deleting} aria-busy={deleting} onClick={() => void handleDelete()}>{deleting ? "Deleting..." : "Delete"}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
}
