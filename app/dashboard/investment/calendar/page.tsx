"use client"
import { Calendar } from "@/components/crypto/calendartab"
import { PageHeader } from "@/components/ui/page-header"

export default function InvestmentCalendarPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-8">
      <PageHeader
        eyebrow="Investment"
        title="Economic Calendar"
        description="Economic calendar, central bank announcements, and upcoming market events."
      />
      <Calendar />
    </div>
  )
}

