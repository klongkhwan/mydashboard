import { getMyWealthData } from "./actions"
import { WealthProvider } from "@/components/my-wealth/wealth-context"

export const dynamic = "force-dynamic"

export default async function MyWealthLayout({ children }: { children: React.ReactNode }) {
  const data = await getMyWealthData()

  return (
    <WealthProvider initialData={data}>
      <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 space-y-4">
        {children}
      </div>
    </WealthProvider>
  )
}

