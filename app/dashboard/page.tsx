'use client'

import { PageHeader } from "@/components/ui/page-header"

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Welcome back!"
        description="Here's what's happening with your activities and systems today."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-spotify p-6 flex flex-col gap-4 border border-white/5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <div className="w-5 h-5 rounded-full bg-primary" />
            </div>
            <div>
              <p className="text-spotify-label text-[#b3b3b3]">Stat {i}</p>
              <p className="text-2xl font-bold mt-1 text-white">Value {i}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

