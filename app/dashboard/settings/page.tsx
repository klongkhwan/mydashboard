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
  const { isLoading: isSettingsLoading } = useSettings()
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    getProfile().then(setProfile)
  }, [])

  if (isSettingsLoading || !profile) {
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
        <TabsList className="grid w-full grid-cols-2 bg-card border border-border">
          <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4" />
            <span>My Profile</span>
          </TabsTrigger>
          <TabsTrigger value="page" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-4 w-4" />
            <span>Page</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileSettings initialProfile={profile} />
        </TabsContent>

        <TabsContent value="page" className="space-y-6">
          <CoinSelectionTable onSave={handleSave} saveButtonText="บันทึก" />
        </TabsContent>
      </Tabs>
    </div>
  )
}


function ProfileSettings({ initialProfile }: { initialProfile: any }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [profile, setProfile] = useState<any>(initialProfile)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialProfile?.avatar_url)

  useEffect(() => {
    // Sync if needed, but usually initialProfile is enough
    setProfile(initialProfile)
    setPreviewUrl(initialProfile?.avatar_url)
  }, [initialProfile])

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

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPasswordLoading(true)
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
      setIsPasswordLoading(false)
    }
  }


  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Left column: Substantial Profile Summary - Matching Height */}
      <div className="lg:col-span-4">
        <Card className="bg-card/90 border-border/50 overflow-hidden relative shadow-none h-full flex flex-col group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/50" />

          <CardContent className="p-8 flex flex-col items-center text-center relative z-10 flex-1 justify-center">
            <div className="relative mb-6">
              <div className="h-40 w-40 rounded-full p-1.5 bg-gradient-to-br from-primary/40 via-accent/20 to-transparent relative">
                <div className="h-full w-full rounded-full overflow-hidden border-4 border-background bg-muted relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl || "https://ui.shadcn.com/avatars/02.png"}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />

                  {/* Upload Overlay */}
                  <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Change Photo</span>
                  </label>
                </div>
              </div>
            </div>

            <h3 className="text-2xl font-black gradient-text mb-2 tracking-tight">{profile.full_name || "New User"}</h3>
            <p className="text-sm text-muted-foreground mb-6 font-medium">{profile.email}</p>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] bg-primary/10 text-primary border border-primary/20">
              <Shield className="w-3.5 h-3.5" />
              {profile.role || "User"}
            </div>
          </CardContent>

          <div className="px-8 py-5 bg-muted/30 border-t border-border/40 flex justify-between items-center text-[11px] mt-auto">
            <span className="text-muted-foreground uppercase font-bold tracking-widest">Account Status</span>
            <span className="text-primary font-black flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(57,255,20,0.5)]" />
              ACTIVE
            </span>
          </div>
        </Card>

      </div>

      {/* Right column: Form Sections (Stacked & Compact) */}
      <div className="lg:col-span-8 space-y-4">
        {/* Personal Information */}
        <Card className="border-border/50 bg-card/95 shadow-none relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary via-accent to-primary" />

          <CardHeader className="p-4 px-6 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <User className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-black gradient-text tracking-tight uppercase">Personal Information</CardTitle>
                <CardDescription className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">Public identity details</CardDescription>
              </div>
            </div>

            <Button
              type="submit"
              form="personal-info-form"
              disabled={isLoading}
              className="h-10 px-8 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all rounded-lg"
            >
              {isLoading ? (
                <div className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                "บันทึก"
              )}
            </Button>
          </CardHeader>
          <Separator className="opacity-20" />
          <CardContent className="p-6">
            <form id="personal-info-form" onSubmit={handleSubmit} className="space-y-6">
              <input type="hidden" name="avatarUrl" value={profile.avatar_url || ""} />
              <input
                id="avatar-upload"
                name="imageFile"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 group/field">
                  <Label htmlFor="email" className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-2 group-focus-within/field:text-primary transition-colors">
                    <Bell className="w-3 h-3 text-primary/40" /> Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      value={profile.email || ""}
                      disabled
                      className="h-10 text-xs bg-muted/30 border-border/40 text-muted-foreground/50 font-bold pr-10 border-dashed"
                    />
                    <Lock className="absolute right-3.5 top-3 h-3.5 w-3.5 text-muted-foreground/20" />
                  </div>
                </div>

                <div className="space-y-1.5 group/field">
                  <Label htmlFor="fullName" className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-2 group-focus-within/field:text-primary transition-colors">
                    <User className="w-3 h-3 text-primary/40" /> Full Name
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    defaultValue={profile.full_name || ""}
                    placeholder="Enter your name"
                    className="h-10 text-xs bg-background/40 border-border/80 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold px-4"
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security / Password */}
        <Card className="border-border/50 bg-card/95 shadow-none relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-accent via-primary to-accent" />

          <CardHeader className="p-4 px-6 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-black gradient-text tracking-tight uppercase">Account Security</CardTitle>
                <CardDescription className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">Access credentials</CardDescription>
              </div>
            </div>

            <Button
              type="submit"
              form="password-form"
              disabled={isPasswordLoading}
              className="h-10 px-8 bg-accent hover:bg-accent/90 text-black font-black uppercase tracking-widest text-[11px] shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 transition-all rounded-lg"
            >
              {isPasswordLoading ? (
                <div className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                "บันทึก"
              )}
            </Button>
          </CardHeader>
          <Separator className="opacity-20" />
          <CardContent className="p-6">
            <form id="password-form" onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 group/field">
                  <Label htmlFor="newPassword" className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-2 group-focus-within/field:text-accent transition-colors">
                    <Shield className="w-3 h-3 text-accent/40" /> New Password
                  </Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="••••••••"
                    className="h-10 text-xs bg-background/40 border-border/80 focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all font-bold px-4"
                  />
                </div>

                <div className="space-y-1.5 group/field">
                  <Label htmlFor="confirmPassword" className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-2 group-focus-within/field:text-accent transition-colors">
                    <Lock className="w-3 h-3 text-accent/40" /> Confirm
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="h-10 text-xs bg-background/40 border-border/80 focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all font-bold px-4"
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}