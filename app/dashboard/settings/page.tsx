'use client'

import { ModernPageLoading } from "@/components/ui/modern-loader"
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
import Link from "next/link"
import { CoinSelectionTable } from "@/components/coin-selection-table"
import { isAdminRole } from "@/lib/roles"
import { useSettings } from "@/hooks/use-settings"
import { getProfile, updateProfile, updatePassword } from "./actions"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { th } from "date-fns/locale"

import { ReusableDataTable } from "@/components/ui/reusable-data-table"
import { PageHeader } from "@/components/ui/page-header"
import { type ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"

export default function SettingsPage() {
  const { isLoading: isSettingsLoading } = useSettings()
  const [profile, setProfile] = useState<any>(null)
  
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    getProfile().then(setProfile)
  }, [])

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "symbol",
      header: "Coin",
      cell: ({ row }) => <span className="font-bold text-white uppercase">{row.original.symbol}</span>
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <span className="text-spotify-muted">{row.original.name}</span>
    }
  ], [])

  if (isSettingsLoading || !profile) {
    return <ModernPageLoading />
  }

  const handleSave = () => {
    alert('Settings saved successfully!')
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-8">
      <PageHeader
        eyebrow="Account & Preferences"
        title="Settings"
        description="Manage your application settings, profile preferences, and watchlist configurations."
      />


      <Tabs defaultValue="profile" className="space-y-8">
        <div className="sticky top-0 bg-background/80 backdrop-blur-md z-20 pt-2 pb-4">
          <TabsList className="flex w-fit bg-transparent p-0 gap-2 border-none">
            <TabsTrigger value="profile" className="btn-pill data-[state=active]:bg-primary data-[state=active]:text-black border-none px-6 py-2 h-auto transition-all duration-300">
              <User className="h-4 w-4 mr-2" />
              My Profile
            </TabsTrigger>
            <TabsTrigger value="page" className="btn-pill data-[state=active]:bg-primary data-[state=active]:text-black border-none px-6 py-2 h-auto transition-all duration-300">
              <Settings className="h-4 w-4 mr-2" />
              Page
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-8 mt-0">
          <ProfileSettings initialProfile={profile} />
        </TabsContent>

        <TabsContent value="page" className="space-y-8 mt-0">
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Left column: Substantial Profile Summary - Matching Height */}
      <div className="lg:col-span-4">
        <Card className="card-spotify border border-white/5 shadow-heavy bg-card overflow-hidden relative h-full flex flex-col group">
          <CardContent className="p-10 flex flex-col items-center text-center relative z-10 flex-1 justify-center">
            <div className="relative mb-8">
              <div className="h-48 w-48 rounded-full p-1 bg-surface-hover relative shadow-play group-hover:scale-105 transition-transform duration-500">
                <div className="h-full w-full rounded-full overflow-hidden border-4 border-card bg-black relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl || "https://ui.shadcn.com/avatars/02.png"}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />

                  {/* Upload Overlay */}
                  <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Change Photo</span>
                  </label>
                </div>
              </div>
            </div>

            <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">{profile.full_name || "New User"}</h3>
            <p className="text-sm text-spotify-muted mb-8 font-bold uppercase tracking-widest">{profile.email}</p>

            <div className="inline-block">
              <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] bg-primary text-black shadow-play">
                <Shield className="w-4 h-4" />
                {profile.role || "User"}
              </div>
              {isAdminRole(profile.role) && (
                <Link
                  href="/dashboard/memories"
                  aria-label="Open Memory"
                  className="mx-auto mt-3 block h-2 w-2 rounded-full bg-transparent"
                />
              )}
            </div>
          </CardContent>

          <div className="px-10 py-6 bg-black/20 border-t border-white/5 flex justify-between items-center text-[11px]">
            <span className="text-spotify-muted uppercase font-black tracking-widest">Status</span>
            <span className="text-primary font-black flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-play" />
              ACTIVE
            </span>
          </div>
        </Card>
      </div>

      {/* Right column: Form Sections (Stacked & Compact) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Personal Information */}
        <Card className="card-spotify border border-white/5 bg-card/60 shadow-none relative overflow-hidden group backdrop-blur-md">
          <CardHeader className="p-6 flex flex-row items-center justify-between space-y-0 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-play">
                <User className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-spotify-label text-white">Personal Information</CardTitle>
                <CardDescription className="text-[10px] font-bold text-spotify-muted uppercase tracking-widest mt-0.5">Public identity details</CardDescription>
              </div>
            </div>

            <Button
              type="submit"
              form="personal-info-form"
              disabled={isLoading}
              variant="pill" className="h-10 px-8"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                "บันทึก"
              )}
            </Button>
          </CardHeader>
          <CardContent className="p-8">
            <form id="personal-info-form" onSubmit={handleSubmit} className="space-y-8">
              <input type="hidden" name="avatarUrl" value={profile.avatar_url || ""} />
              <input
                id="avatar-upload"
                name="imageFile"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-spotify-label">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      value={profile.email || ""}
                      disabled
                      variant="pill" className="bg-black/40 text-spotify-muted border-dashed h-12"
                    />
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/10" />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="fullName" className="text-spotify-label">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    defaultValue={profile.full_name || ""}
                    placeholder="Enter your name"
                    variant="pill" className="h-12"
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security / Password */}
        <Card className="card-spotify border border-white/5 bg-card/60 shadow-none relative overflow-hidden group backdrop-blur-md">
          <CardHeader className="p-6 flex flex-row items-center justify-between space-y-0 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shadow-play">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-spotify-label text-white">Account Security</CardTitle>
                <CardDescription className="text-[10px] font-bold text-spotify-muted uppercase tracking-widest mt-0.5">Access credentials</CardDescription>
              </div>
            </div>

            <Button
              type="submit"
              form="password-form"
              disabled={isPasswordLoading}
              variant="destructive" className="h-10 px-8 rounded-full"
            >
              {isPasswordLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "อัปเดตรหัสผ่าน"
              )}
            </Button>
          </CardHeader>
          <CardContent className="p-8">
            <form id="password-form" onSubmit={handlePasswordSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2.5">
                  <Label htmlFor="newPassword" className="text-spotify-label">
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="••••••••"
                    variant="pill" className="h-12"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="confirmPassword" className="text-spotify-label">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    variant="pill" className="h-12"
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
