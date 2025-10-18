import CalendarView from '@/components/features/CalendarView'
import { auth } from '@/lib/better-auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function CalendarPage() {
  const result = await auth.api.getSession({
    headers: await headers()
  })
  
  if (!result?.user) {
    redirect('/login')
  }

  return <CalendarView userId={result.user.id} />
}
