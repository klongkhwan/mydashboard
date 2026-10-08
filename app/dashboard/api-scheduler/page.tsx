"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Plus, Edit, Pause, Play, Trash2, PlayCircle, Clock } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ApiSchedule, CreateScheduleRequest } from "@/types/api-scheduler"
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleScheduleStatus
} from "@/lib/api-scheduler"
import { supabase } from "@/lib/supabase"
import { PageLoading, Loading } from "@/components/ui/loading"

import { ReusableDataTable } from "@/components/ui/reusable-data-table"
import { PageHeader } from "@/components/ui/page-header"
import { type ColumnDef, type Row } from "@tanstack/react-table"
import { useMemo } from "react"


export default function ApiSchedulerPage() {
  const [schedules, setSchedules] = useState<ApiSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [checkLoading, setCheckLoading] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ApiSchedule | null>(null)
  
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // ... (rest of the component state)
  const [formData, setFormData] = useState({
    apiName: "",
    url: "",
    method: "POST" as ApiSchedule["method"],
    time: "",
    frequency: "DAILY" as ApiSchedule["frequency"],
    headers: "",
    body: "",
  })

  // Add functionality to trigger cron check manually
  const handleCheckSchedules = async (silent = false) => {
    if (!silent) setCheckLoading(true)
    try {
      const res = await fetch('/api/scheduler/cron')
      const data = await res.json()
      if (res.ok) {
        if (!silent) {
          toast({
            title: "Scheduler Check Complete",
            description: `Executed: ${data.executed}, Errors: ${data.errors}`,
          })
        }
        // Only reload if tasks were executed or we are in manual mode to show 'no updates'
        if (data.executed > 0 || !silent) {
          loadSchedules()
        }
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      if (!silent) toast({ title: "Error", description: "Failed to run scheduler check", variant: "destructive" })
    } finally {
      if (!silent) setCheckLoading(false)
    }
  }




  useEffect(() => {
    loadSchedules()

    // Realtime subscription
    const channel = supabase
      .channel('api-scheduler-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'api_schedules',
        },
        (payload: any) => {
          console.log('Realtime update received:', payload)
          loadSchedules(false) // Silent reload
          // Optional: Show a subtle toast if needed, but usually silent is better for status updates
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadSchedules = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      const data = await getSchedules()
      setSchedules(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load schedules",
        variant: "destructive",
      })
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      apiName: "",
      url: "",
      method: "GET",
      time: "",
      frequency: "DAILY",
      headers: "",
      body: "",
    })
    setEditingSchedule(null)
  }

  const handleAddSchedule = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleEditSchedule = (schedule: ApiSchedule) => {
    setEditingSchedule(schedule)

    // Convert headers to JSON string if it's an object
    let headersString = ""
    if (schedule.headers) {
      if (typeof schedule.headers === 'string') {
        headersString = schedule.headers
      } else {
        headersString = JSON.stringify(schedule.headers, null, 2)
      }
    }

    // Convert body to JSON string if it's an object
    let bodyString = ""
    if (schedule.body) {
      if (typeof schedule.body === 'string') {
        bodyString = schedule.body
      } else {
        bodyString = JSON.stringify(schedule.body, null, 2)
      }
    }

    setFormData({
      apiName: schedule.api_name,
      url: schedule.url,
      method: schedule.method,
      time: schedule.time,
      frequency: schedule.frequency,
      headers: headersString,
      body: bodyString,
    })
    setIsModalOpen(true)
  }

  const handleSaveSchedule = async () => {
    if (!formData.apiName || !formData.url || !formData.time) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      // Store headers as string (JSON)
      let headers: string | undefined = undefined
      if (formData.headers.trim()) {
        try {
          // Validate JSON but store as string
          JSON.parse(formData.headers)
          headers = formData.headers
        } catch (error) {
          toast({
            title: "JSON Error",
            description: "Invalid JSON format in Headers. Check for missing quotes, commas, or brackets.",
            variant: "destructive",
          })
          return
        }
      }

      // Store body as string (JSON)
      let body: string | undefined = undefined
      if (formData.body.trim()) {
        try {
          // Validate JSON but store as string
          JSON.parse(formData.body)
          body = formData.body
        } catch (error) {
          toast({
            title: "JSON Error",
            description: "Invalid JSON format in Body. Check for missing quotes, commas, or brackets.",
            variant: "destructive",
          })
          return
        }
      }

      const scheduleData: CreateScheduleRequest = {
        api_name: formData.apiName,
        url: formData.url,
        method: formData.method,
        time: formData.time,
        frequency: formData.frequency,
        headers,
        body,
        status: "ACTIVE",
      }

      if (editingSchedule) {
        await updateSchedule({
          id: editingSchedule.id,
          ...scheduleData,
        })
        toast({
          title: "Success",
          description: "Schedule updated successfully",
        })
      } else {
        await createSchedule(scheduleData)
        toast({
          title: "Success",
          description: "Schedule created successfully",
        })
      }

      await loadSchedules()
      setIsModalOpen(false)
      resetForm()
    } catch (error) {
      console.error('Save schedule error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save schedule. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleScheduleStatus(id)
      await loadSchedules()
      toast({
        title: "Success",
        description: "Schedule status updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update schedule status",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteSchedule(id)
      await loadSchedules()
      toast({
        title: "Success",
        description: "Schedule deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive",
      })
    }
  }

  const handleManualTrigger = async (schedule: ApiSchedule) => {
    try {
      toast({
        title: "Triggering API",
        description: `Running ${schedule.api_name} manually...`,
      })

      // Prepare request options
      let headers = {}
      if (schedule.headers) {
        try {
          headers = typeof schedule.headers === 'string'
            ? JSON.parse(schedule.headers)
            : schedule.headers
        } catch (error) {
          console.warn('Failed to parse headers:', schedule.headers, error)
          headers = {}
        }
      }
      const body = schedule.body

      // Build the full URL - use proxy for PropertyHub GraphQL to avoid CORS
      let fullUrl = schedule.url
      if (schedule.url.includes('propertyhub.in.th/graphql')) {
        fullUrl = '/api/proxy/graphql'
      } else if (!schedule.url.startsWith('http')) {
        // Try to detect if it's a relative URL or a full domain
        if (schedule.url.startsWith('/api')) {
          fullUrl = `${window.location.origin}${schedule.url}`
        } else if (schedule.url.includes('.')) {
          fullUrl = `https://${schedule.url}`
        } else {
          fullUrl = `${window.location.origin}${schedule.url}`
        }
      }

      // Prepare request data
      const requestHeaders = {
        'accept': '*/*',
        'accept-language': 'en-GB,en;q=0.9',
        'Content-Type': 'application/json',
        'locale': 'TH',
        'origin': 'https://dashboard.propertyhub.in.th',
        'referer': 'https://dashboard.propertyhub.in.th/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        ...headers,
      }

      // Handle GraphQL requests properly
      let requestBody: string | undefined
      if (body) {
        if (typeof body === 'string') {
          requestBody = body
        } else if (typeof body === 'object' && body !== null) {
          requestBody = JSON.stringify(body)
        } else {
          requestBody = String(body)
        }
      }

      // Debug: Log the request details
      console.log('🔍 API Request Details:', {
        url: fullUrl,
        method: schedule.method,
        headers: requestHeaders,
        body: requestBody,
      })

      // Debug: Log raw data
      console.log('🔍 Raw Schedule Data:', {
        id: schedule.id,
        api_name: schedule.api_name,
        url: schedule.url,
        method: schedule.method,
        headers: schedule.headers,
        body: schedule.body,
      })

      // Make the API call with CORS handling
      const response = await fetch(fullUrl, {
        method: schedule.method,
        headers: requestHeaders,
        ...(requestBody && { body: requestBody }),
        mode: 'cors', // Explicitly set CORS mode
      })

      const result = {
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        timestamp: new Date().toISOString(),
      }

      // Update last_run in database
      await updateSchedule({
        id: schedule.id,
        last_run: new Date().toISOString(),
      })

      // Try to get response details for debugging
      let responseDetails = `Status: ${response.status} - ${response.statusText}`
      try {
        const responseText = await response.text()
        if (responseText) {
          responseDetails += `\nResponse: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`
        }
      } catch (e) {
        // Ignore response parsing errors
      }

      // Show result
      if (response.ok) {
        toast({
          title: "✅ API Triggered Successfully",
          description: responseDetails,
        })
      } else {
        toast({
          title: `❌ API Error (${response.status})`,
          description: responseDetails,
          variant: "destructive",
        })
      }

      await loadSchedules()
    } catch (error) {
      console.error('Manual trigger error:', error)
      // ...
    }
  }

  const columns = useMemo<ColumnDef<ApiSchedule>[]>(() => [
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status)
    },
    {
      accessorKey: "api_name",
      header: "API Name",
      cell: ({ row }) => <span className="font-bold text-white group-hover:text-primary transition-colors">{row.original.api_name}</span>
    },
    {
      accessorKey: "url",
      header: "URL",
      cell: ({ row }) => <span className="text-spotify-muted group-hover:text-white truncate max-w-[200px] block">{row.original.url}</span>
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => getMethodBadge(row.original.method)
    },
    {
      accessorKey: "frequency",
      header: "Frequency",
      cell: ({ row }) => <span className="text-spotify-muted">{getFrequencyDisplay(row.original.frequency)}</span>
    },
    {
      accessorKey: "time",
      header: "Time",
      cell: ({ row }) => <span className="text-spotify-muted tabular-nums">{row.original.time}</span>
    },
    {
      accessorKey: "next_run",
      header: "Next Run",
      cell: ({ row }) => <span className="text-primary font-bold tabular-nums">{formatLastRun(row.original.next_run)}</span>
    },
    {
      accessorKey: "last_run",
      header: "Last Run",
      cell: ({ row }) => <span className="text-spotify-muted tabular-nums">{formatLastRun(row.original.last_run)}</span>
    },
    {
      id: "manual",
      header: "Manual",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleManualTrigger(row.original)}
          className="h-8 px-4 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white text-[10px] font-bold uppercase tracking-wider"
        >
          <PlayCircle className="w-3.5 h-3.5 mr-1.5 text-primary" />
          Run
        </Button>
      )
    },
    {
      id: "actions",
      header: () => <div className="text-right pr-6">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1 transition-opacity pr-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditSchedule(row.original)}
            className="h-8 w-8 text-[#b3b3b3] hover:text-white"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggleStatus(row.original.id)}
            className="h-8 w-8 text-[#b3b3b3] hover:text-white"
          >
            {row.original.status === "ACTIVE" ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteSchedule(row.original.id)}
            className="h-8 w-8 text-[#b3b3b3] hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ], [])

  const getStatusBadge = (status: ApiSchedule["status"]) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-primary text-black hover:bg-primary/90 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Active</Badge>
      case "PAUSED":
        return <Badge className="bg-[#282828] text-[#b3b3b3] hover:bg-[#333333] rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Paused</Badge>
      case "FAILED":
        return <Badge className="bg-destructive text-white hover:bg-destructive/90 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Failed</Badge>
    }
  }

  const getMethodBadge = (method: ApiSchedule["method"]) => {
    const methodColors: Record<string, string> = {
      "GET": "bg-[#181818] text-[#1ed760] border-white/5",
      "POST": "bg-[#181818] text-[#ffa42b] border-white/5",
      "PUT": "bg-[#181818] text-[#539df5] border-white/5",
      "PATCH": "bg-[#181818] text-[#cbcbcb] border-white/5",
      "DELETE": "bg-[#181818] text-[#f3727f] border-white/5",
    }
    return <Badge className={cn("rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border", methodColors[method] || "bg-[#181818] text-[#b3b3b3] border-white/5")}>{method}</Badge>
  }

  const getFrequencyDisplay = (frequency: ApiSchedule["frequency"]) => {
    switch (frequency) {
      case "DAILY":
        return "Daily"
      case "WEEKLY":
        return "Weekly"
      case "MONTHLY":
        return "Monthly"
      case "CUSTOM":
        return "Every 6 hrs"
      default:
        return frequency
    }
  }

  const formatLastRun = (lastRun: string | null) => {
    if (!lastRun) return "Never"
    return new Date(lastRun).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-8">
      <PageHeader
        eyebrow="System & Automation"
        title="API Scheduler"
        description="Manage your scheduled API calls, crons, and background automations."
        action={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => handleCheckSchedules(false)}
              disabled={checkLoading}
              variant="ghost"
              className="btn-pill bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white"
            >
              {checkLoading ? <Loading variant="spinner" size="sm" className="mr-2" /> : <Clock className="w-4 h-4 mr-2 text-primary" />}
              Check Now
            </Button>
            <Button
              onClick={handleAddSchedule}
              className="btn-pill-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule
            </Button>
          </div>
        }
      />


      <ReusableDataTable
        columns={columns}
        data={schedules}
        loading={loading}
        page={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        manualPagination={false}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingSchedule ? "Edit Schedule" : "Add New Schedule"}
            </DialogTitle>
            <DialogDescription className="text-spotify-muted">
              Configure your API schedule settings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label htmlFor="apiName" className="text-right text-spotify-label">
                API Name
              </Label>
              <Input
                id="apiName"
                value={formData.apiName}
                onChange={(e) => setFormData((prev) => ({ ...prev, apiName: e.target.value }))}
                className="col-span-3 spotify-input"
                placeholder="e.g., Refresh Listing"
              />
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label htmlFor="url" className="text-right text-spotify-label">
                URL
              </Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                className="col-span-3 spotify-input"
                placeholder="e.g., /graphql"
              />
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label htmlFor="method" className="text-right text-spotify-label">
                Method
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.method}
                  onValueChange={(value: ApiSchedule["method"]) =>
                    setFormData((prev) => ({ ...prev, method: value }))
                  }
                >
                  <SelectTrigger className="spotify-input w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#282828] border-none text-white shadow-heavy">
                    <SelectItem value="GET" className="focus:bg-white/10 cursor-pointer">GET</SelectItem>
                    <SelectItem value="POST" className="focus:bg-white/10 cursor-pointer">POST</SelectItem>
                    <SelectItem value="PATCH" className="focus:bg-white/10 cursor-pointer">PATCH</SelectItem>
                    <SelectItem value="PUT" className="focus:bg-white/10 cursor-pointer">PUT</SelectItem>
                    <SelectItem value="DELETE" className="focus:bg-white/10 cursor-pointer">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label htmlFor="time" className="text-right text-spotify-label">
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                className="col-span-3 spotify-input"
              />
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label htmlFor="frequency" className="text-right text-spotify-label">
                Frequency
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.frequency}
                  onValueChange={(value: ApiSchedule["frequency"]) =>
                    setFormData((prev) => ({ ...prev, frequency: value }))
                  }
                >
                  <SelectTrigger className="spotify-input w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#282828] border-none text-white shadow-heavy">
                    <SelectItem value="DAILY" className="focus:bg-white/10 cursor-pointer">Daily</SelectItem>
                    <SelectItem value="WEEKLY" className="focus:bg-white/10 cursor-pointer">Weekly</SelectItem>
                    <SelectItem value="MONTHLY" className="focus:bg-white/10 cursor-pointer">Monthly</SelectItem>
                    <SelectItem value="CUSTOM" className="focus:bg-white/10 cursor-pointer">Custom (cron)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label htmlFor="headers" className="text-right pt-2 text-spotify-label">
                Headers
              </Label>
              <Textarea
                id="headers"
                value={formData.headers}
                onChange={(e) => setFormData((prev) => ({ ...prev, headers: e.target.value }))}
                className="col-span-3 bg-[#121212] border-none rounded-lg p-4 font-mono text-[13px] text-white shadow-inset focus:ring-1 focus:ring-white/20"
                style={{ resize: 'none', minHeight: '120px' }}
                placeholder='{"Content-Type": "application/json"}'
              />
            </div>
            {(formData.method === "POST" || formData.method === "PUT" || formData.method === "PATCH") && (
              <div className="grid grid-cols-4 gap-4 items-start">
                <Label htmlFor="body" className="text-right pt-2 text-spotify-label">
                  Body
                </Label>
                <Textarea
                  id="body"
                  value={formData.body}
                  onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
                  className="col-span-3 bg-[#121212] border-none rounded-lg p-4 font-mono text-[13px] text-white shadow-inset focus:ring-1 focus:ring-white/20"
                  style={{ resize: 'none', minHeight: '180px' }}
                  placeholder='{ "query": "..." }'
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-[#b3b3b3] hover:text-white">
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule} className="btn-pill-primary">
              Save Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}