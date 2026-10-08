"use client"

import { Button } from "@/components/ui/button"

export default function MyWealthError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto w-full max-w-[1600px] p-6 lg:p-8">
      <section className="card-spotify p-6 space-y-4 border border-white/5">
        <h1 className="text-xl font-bold">ไม่สามารถโหลดข้อมูล My Wealth ได้</h1>
        <p className="text-spotify-muted">เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง</p>
        <Button onClick={reset}>ลองใหม่</Button>
      </section>
    </div>
  )
}
