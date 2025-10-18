import { auth } from '@/lib/better-auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import DashboardHeader from '@/components/layout/DashboardHeader'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 md:ml-60 flex flex-col">
        {/* Hidden on mobile */}
        <div className="hidden md:block">
          <DashboardHeader />
        </div>
        <main className="flex-1 p-3 md:p-8 pb-16 md:pb-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
