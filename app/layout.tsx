import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './globals-calendar.css'
import { Providers } from '@/components/providers/Providers'
import { initializeBackgroundJobs } from '@/lib/services/init'

const inter = Inter({ subsets: ['latin'] })

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  title: 'SokaPost - Social Media Management',
  description: 'Manage your Threads and Instagram content effortlessly',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'SokaPost - Social Media Management',
    description: 'Manage your Threads and Instagram content effortlessly',
    type: 'website',
    url: baseUrl,
    siteName: 'SokaPost',
    images: [
      {
        url: `${baseUrl}/api/og`,
        width: 1200,
        height: 630,
        alt: 'SokaPost - Social Media Management',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SokaPost - Social Media Management',
    description: 'Manage your Threads and Instagram content effortlessly',
    images: [`${baseUrl}/api/og`],
  },
}

// Initialize background jobs on server start (only once)
// Note: In development, this may re-run on hot reload
// But initializeBackgroundJobs has a check to prevent duplicate runs
if (typeof window === 'undefined') {
  initializeBackgroundJobs()
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
