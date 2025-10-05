"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tv, Zap, Play, Pause, Volume2, Search, Send, Clock, CheckCircle, XCircle, Settings } from "lucide-react"

export default function ProgramsPage() {
  const [activeTab, setActiveTab] = useState("tv")

  const tabs = [
    { id: "tv", label: "TV", icon: Tv },
    { id: "api", label: "API", icon: Zap },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">โปรแกรม</h1>
        <p className="text-muted-foreground">จัดการระบบโปรแกรมต่างๆ</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2"
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* TV Tab */}
      {activeTab === "tv" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* TV Player */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tv className="w-5 h-5" />
                  TV Player
                </CardTitle>
                <CardDescription>ดูทีวี บอล หนัง</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                  <div className="text-center text-white">
                    <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">เลือกช่องเพื่อเริ่มดู</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Pause className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Badge variant="secondary">HD</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Channel List */}
            <Card>
              <CardHeader>
                <CardTitle>รายการช่อง</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="ค้นหาช่อง..." className="pl-10" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { name: "ช่อง 3", type: "ทีวี", status: "online" },
                  { name: "ช่อง 7", type: "ทีวี", status: "online" },
                  { name: "True Premier 1", type: "กีฬา", status: "online" },
                  { name: "True Premier 2", type: "กีฬา", status: "offline" },
                  { name: "Netflix", type: "หนัง", status: "online" },
                  { name: "Disney+", type: "หนัง", status: "online" },
                ].map((channel, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <div>
                      <p className="font-medium">{channel.name}</p>
                      <p className="text-sm text-muted-foreground">{channel.type}</p>
                    </div>
                    <Badge variant={channel.status === "online" ? "default" : "secondary"}>{channel.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* API Tab */}
      {activeTab === "api" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* API Request Builder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  API Request Builder
                </CardTitle>
                <CardDescription>สร้างและส่ง API requests อัตโนมัติ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="method">HTTP Method</Label>
                  <Select defaultValue="GET">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    placeholder="https://api.example.com/endpoint"
                    defaultValue="https://jsonplaceholder.typicode.com/posts"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headers">Headers (JSON)</Label>
                  <Textarea
                    id="headers"
                    placeholder='{"Content-Type": "application/json"}'
                    className="font-mono text-sm"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Request Body</Label>
                  <Textarea id="body" placeholder='{"key": "value"}' className="font-mono text-sm" rows={4} />
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1">
                    <Send className="w-4 h-4 mr-2" />
                    Send Request
                  </Button>
                  <Button variant="outline">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* API Response & History */}
            <Card>
              <CardHeader>
                <CardTitle>Response & History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Response</Label>
                  <div className="bg-muted p-3 rounded-lg font-mono text-sm max-h-40 overflow-y-auto">
                    <pre>{`{
  "status": 200,
  "data": {
    "message": "Success",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}`}</pre>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Request History</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {[
                      { method: "GET", url: "/api/users", status: 200, time: "10:30:15" },
                      { method: "POST", url: "/api/posts", status: 201, time: "10:25:32" },
                      { method: "GET", url: "/api/data", status: 404, time: "10:20:45" },
                      { method: "PUT", url: "/api/users/1", status: 200, time: "10:15:12" },
                    ].map((request, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {request.method}
                          </Badge>
                          <span className="text-sm font-mono">{request.url}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {request.status < 300 ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {request.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Automation Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
              <CardDescription>ตั้งค่าการยิง API อัตโนมัติ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Interval (seconds)</Label>
                  <Input type="number" defaultValue="60" min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Max Retries</Label>
                  <Input type="number" defaultValue="3" min="0" />
                </div>
                <div className="space-y-2">
                  <Label>Timeout (ms)</Label>
                  <Input type="number" defaultValue="5000" min="1000" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="default">Start Automation</Button>
                <Button variant="outline">Stop</Button>
                <Button variant="outline">Reset</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
