import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { SupabaseProvider } from '@/components/providers/supabase-provider'
import { Toaster } from 'sonner'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'AllBoard - Your Dashboard',
  description: 'Complete dashboard for all your needs',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          theme="dark"
        />
        <Analytics />
      </body>
    </html>
  )
}
