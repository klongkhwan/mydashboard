'use client'

import { PageLoading } from "@/components/ui/loading"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  User,
  Settings,
  Bell,
  Shield,
  Lock,
  Upload
} from "lucide-react"
import { CoinSelectionTable } from "@/components/coin-selection-table"
import { useSettings } from "@/hooks/use-settings"
import { getProfile, updateProfile, updatePassword } from "./actions"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { th } from "date-fns/locale"

export default function SettingsPage() {
  const { isLoading } = useSettings()

  if (isLoading) {
    return <PageLoading />
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

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4" />
            <span>My Profile</span>
          </TabsTrigger>
          <TabsTrigger value="page" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-4 w-4" />
            <span>Page</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="page" className="space-y-6">
          <CoinSelectionTable onSave={handleSave} saveButtonText="บันทึก" />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SecuritySettings() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)

    try {
      const res = await updatePassword(formData)
      if (res.success) {
        toast.success("Password updated successfully")
          ; (e.target as HTMLFormElement).reset()
      } else {
        toast.error(res.error || "Failed to update password")
      }
    } catch (error) {
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Left Column: Security Status */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="bg-card/50 border-border/50 overflow-hidden relative group backdrop-blur-sm">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-500" />

          <CardContent className="pt-10 pb-8 flex flex-col items-center text-center relative z-10">
            <div className="relative mb-6">
              <div className="h-32 w-32 rounded-full p-1 bg-gradient-to-tr from-emerald-500 via-emerald-500/50 to-transparent shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_40px_-5px_rgba(16,185,129,0.5)] transition-all duration-500">
                <div className="h-full w-full rounded-full flex items-center justify-center border-4 border-background bg-muted">
                  <Shield className="w-12 h-12 text-emerald-500" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center shadow-lg">
                <Lock className="h-3 w-3 text-white" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-foreground mb-1">Security Status</h3>
            <p className="text-sm text-muted-foreground mb-4">Your account is currently protected</p>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Lock className="w-3 h-3" />
              ENCRYPTED
            </div>
          </CardContent>

          <div className="px-6 py-4 bg-muted/30 border-t border-border/50 flex justify-between items-center text-[11px]">
            <span className="text-muted-foreground font-medium uppercase tracking-tighter">Security Level</span>
            <span className="text-emerald-500 font-bold">OPTIMAL</span>
          </div>
        </Card>

        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
          <p className="text-xs text-emerald-500/70 leading-relaxed">
            <span className="font-bold">Security Tip:</span> Use a combination of uppercase, lowercase, numbers, and symbols to create a strong password.
          </p>
        </div>
      </div>

      {/* Right Column: Password Form */}
      <div className="lg:col-span-8">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Update Password</CardTitle>
                <CardDescription>Ensure your account is using a strong, unique password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator className="opacity-50" />
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2 group">
                  <Label htmlFor="newPassword" className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-focus-within:text-emerald-500 transition-colors flex items-center gap-2">
                    <Shield className="w-3 h-3" /> New Password
                  </Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="••••••••"
                    className="bg-background border-border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium pr-10 py-6"
                  />
                </div>

                <div className="space-y-2 group">
                  <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-focus-within:text-emerald-500 transition-colors flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="bg-background border-border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium pr-10 py-6"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="min-w-[140px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all hover:translate-y-[-2px] hover:shadow-emerald-500/40 active:translate-y-[0px] rounded-lg py-6 border-none"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>บันทึก...</span>
                    </div>
                  ) : (
                    "บันทึก"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ProfileSettings() {
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    getProfile().then((data) => {
      setProfile(data)
      setPreviewUrl(data?.avatar_url)
    })
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)

    try {
      const res = await updateProfile(formData)
      if (res.success) {
        toast.success("Profile updated")
        window.dispatchEvent(new Event('profile-updated'))
      } else {
        toast.error(res.error || "Failed to update")
      }
    } catch (error) {
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  if (!profile) return <PageLoading />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Left Column: Profile Summary & Avatar */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="bg-card/50 border-border/50 overflow-hidden relative group backdrop-blur-sm">
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-500" />

          <CardContent className="pt-10 pb-8 flex flex-col items-center text-center relative z-10">
            <div className="relative mb-6">
              <div className="h-32 w-32 rounded-full p-1 bg-gradient-to-tr from-primary via-primary/50 to-transparent shadow-[0_0_30px_-10px_rgba(57,255,20,0.3)] group-hover:shadow-[0_0_40px_-5px_rgba(57,255,20,0.5)] transition-all duration-500">
                <div className="h-full w-full rounded-full overflow-hidden border-4 border-background bg-muted relative group/avatar">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl || "https://ui.shadcn.com/avatars/02.png"}
                    alt="Profile"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover/avatar:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer">
                    <Upload className="w-6 h-6 text-white mb-1" />
                    <span className="text-[10px] text-white font-medium uppercase tracking-wider">Change Photo</span>
                  </div>
                  <Input
                    type="file"
                    name="imageFile"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-primary rounded-full border-2 border-background flex items-center justify-center shadow-lg">
                <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-foreground mb-1">{profile.full_name || "New User"}</h3>
            <p className="text-sm text-muted-foreground mb-4">{profile.email}</p>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              <Shield className="w-3 h-3" />
              {profile.role || "User"}
            </div>
          </CardContent>

          <div className="px-6 py-4 bg-muted/30 border-t border-border/50 flex justify-between items-center text-[11px]">
            <span className="text-muted-foreground font-medium uppercase tracking-tighter">Account Status</span>
            <span className="text-primary font-bold">ACTIVE</span>
          </div>
        </Card>

        <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
          <p className="text-xs text-primary/70 leading-relaxed">
            <span className="font-bold">Pro Tip:</span> A complete profile helps your team recognize you and builds better collaboration within the dashboard.
          </p>
        </div>
      </div>

      {/* Right Column: Information Form */}
      <div className="lg:col-span-8">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your profile details and preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator className="opacity-50" />
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <input type="hidden" name="avatarUrl" value={profile.avatar_url || ""} />

              <div className="grid gap-6">
                <div className="space-y-2 group">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-focus-within:text-primary transition-colors flex items-center gap-2">
                    <Bell className="w-3 h-3" /> Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      value={profile.email || ""}
                      disabled
                      className="bg-muted/50 border-border focus:border-primary/50 text-muted-foreground font-medium pr-10"
                    />
                    <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                    <span className="text-primary opacity-50">•</span> For security, email changes require administrator approval.
                  </p>
                </div>

                <div className="space-y-2 group">
                  <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-focus-within:text-primary transition-colors flex items-center gap-2">
                    <User className="w-3 h-3" /> Full Name
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    defaultValue={profile.full_name || ""}
                    placeholder="Enter your full name"
                    className="bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium py-6"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Shield className="w-3 h-3" /> Permissions Role
                  </Label>
                  <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50 group hover:border-primary/20 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground capitalize">{profile.role || "user"}</div>
                      <div className="text-[10px] text-muted-foreground">Your role determines the features you can access in the system.</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="min-w-[140px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all hover:translate-y-[-2px] hover:shadow-primary/40 active:translate-y-[0px] rounded-lg py-6"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    "บันทึก"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}