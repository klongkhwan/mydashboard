'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Settings,
  Bell,
  Shield,
  Lock
} from "lucide-react"
import { CoinSelectionTable } from "@/components/coin-selection-table"
import { useSettings } from "@/hooks/use-settings"

export default function SettingsPage() {
  const { isLoading } = useSettings()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const handleSave = () => {
    alert('Settings saved successfully!')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your application settings and preferences</p>
      </div>

      <Tabs defaultValue="page" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="page" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-4 w-4" />
            <span>Page</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="page" className="space-y-6">
          <CoinSelectionTable onSave={handleSave} saveButtonText="Save Settings" />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Coin Price Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when coin prices change significantly</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Browser Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive desktop notifications</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sound Alerts</Label>
                  <p className="text-sm text-muted-foreground">Play sound for important notifications</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="space-y-4">
                <Label>Alert Thresholds</Label>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Price change  5%</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Price change 10%</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Price change 20%</span>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" placeholder="Enter current password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" placeholder="Enter new password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" placeholder="Confirm new password" />
              </div>
              <Button className="w-full" onClick={() => {
                // UI only - no backend implementation
                alert('Password change functionality (UI only)');
              }}>
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}