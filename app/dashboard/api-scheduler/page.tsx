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
import { Plus, Edit, Pause, Play, Trash2, PlayCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ApiSchedule, CreateScheduleRequest } from "@/types/api-scheduler"
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleScheduleStatus
} from "@/lib/api-scheduler"

export default function ApiSchedulerPage() {
  const [schedules, setSchedules] = useState<ApiSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ApiSchedule | null>(null)
  const [formData, setFormData] = useState({
    apiName: "",
    url: "",
    method: "POST" as ApiSchedule["method"],
    time: "",
    frequency: "DAILY" as ApiSchedule["frequency"],
    headers: "",
    body: "",
  })

  useEffect(() => {
    loadSchedules()
  }, [])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const data = await getSchedules()
      setSchedules(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load schedules",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      toast({
        title: "❌ API Trigger Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: ApiSchedule["status"]) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-500 hover:bg-green-600">✅ Active</Badge>
      case "PAUSED":
        return <Badge className="bg-orange-500 hover:bg-orange-600">⏸ Paused</Badge>
      case "FAILED":
        return <Badge className="bg-red-500 hover:bg-red-600">❌ Failed</Badge>
    }
  }

  const getMethodBadge = (method: ApiSchedule["method"]) => {
    const methodColors: Record<string, string> = {
      "GET": "bg-green-100 text-green-800 border-green-300 hover:bg-green-200",
      "POST": "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200",
      "PUT": "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200",
      "PATCH": "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200",
      "DELETE": "bg-red-100 text-red-800 border-red-300 hover:bg-red-200",
      "HEAD": "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200",
      "OPTIONS": "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200",
    }
    return <Badge className={methodColors[method] || "bg-gray-100 text-gray-800"}>{method}</Badge>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-balance">API Scheduler</h2>
          <p className="text-muted-foreground">Manage your scheduled API calls and automations</p>
        </div>
        <Button
          onClick={handleAddSchedule}
          className="bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Schedule
        </Button>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Scheduled APIs</CardTitle>
          <CardDescription>Manage your API schedules and execution history</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>API Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Manual</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading schedules...
                  </TableCell>
                </TableRow>
              ) : schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No schedules found. Create your first schedule!
                  </TableCell>
                </TableRow>
              ) : (
                schedules.map((schedule) => (
                  <TableRow key={schedule.id} className="border-border/30">
                    <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                    <TableCell className="font-medium">{schedule.api_name}</TableCell>
                    <TableCell className="text-muted-foreground">{schedule.url}</TableCell>
                    <TableCell>
                      {getMethodBadge(schedule.method)}
                    </TableCell>
                    <TableCell>{schedule.time}</TableCell>
                    <TableCell>{getFrequencyDisplay(schedule.frequency)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatLastRun(schedule.last_run)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManualTrigger(schedule)}
                        className="h-8 px-2 text-xs hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                      >
                        <PlayCircle className="w-3 h-3 mr-1" />
                        Run Now
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSchedule(schedule)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(schedule.id)}
                          className="h-8 w-8 p-0"
                        >
                          {schedule.status === "ACTIVE" ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? "Edit Schedule" : "Add New Schedule"}
            </DialogTitle>
            <DialogDescription>
              Configure your API schedule settings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label htmlFor="apiName" className="text-right pt-2">
                API Name
              </Label>
              <Input
                id="apiName"
                value={formData.apiName}
                onChange={(e) => setFormData((prev) => ({ ...prev, apiName: e.target.value }))}
                className="col-span-3"
                placeholder="e.g., Refresh Listing"
              />
            </div>
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label htmlFor="url" className="text-right pt-2">
                Endpoint URL
              </Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                className="col-span-3"
                placeholder="e.g., /graphql"
              />
            </div>
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label htmlFor="method" className="text-right pt-2">
                HTTP Method
              </Label>
              <Select
                value={formData.method}
                onValueChange={(value: ApiSchedule["method"]) =>
                  setFormData((prev) => ({ ...prev, method: value }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="HEAD">HEAD</SelectItem>
                  <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label htmlFor="time" className="text-right pt-2">
                Schedule Time
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label htmlFor="frequency" className="text-right pt-2">
                Frequency
              </Label>
              <Select
                value={formData.frequency}
                onValueChange={(value: ApiSchedule["frequency"]) =>
                  setFormData((prev) => ({ ...prev, frequency: value }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="CUSTOM">Custom (cron)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label htmlFor="headers" className="text-right pt-2">
                Headers (JSON)
              </Label>
              <Textarea
                id="headers"
                value={formData.headers}
                onChange={(e) => setFormData((prev) => ({ ...prev, headers: e.target.value }))}
                className="col-span-3 font-mono text-sm"
                style={{
                  resize: 'none',
                  overflowY: 'auto',
                  minHeight: '144px',
                  maxHeight: '144px'
                }}
                rows={6}
                placeholder='{"Content-Type": "application/json"}'
              />
            </div>
            {(formData.method === "POST" || formData.method === "PUT" || formData.method === "PATCH") && (
              <div className="grid grid-cols-4 gap-4 items-start">
                <Label htmlFor="body" className="text-right pt-2">
                  Body (JSON)
                </Label>
                <Textarea
                  id="body"
                  value={formData.body}
                  onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
                  className="col-span-3 font-mono text-sm"
                  style={{
                    resize: 'none',
                    overflowY: 'auto',
                    minHeight: '192px',
                    maxHeight: '192px'
                  }}
                  rows={8}
                  placeholder='{
  "query": "your query here",
  "variables": {}
}'
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule} className="bg-green-600 hover:bg-green-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}