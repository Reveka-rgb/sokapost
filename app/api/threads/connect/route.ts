import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { getThreadsAuthUrl } from '@/lib/api/threads'

export async function GET() {
  const session = await getServerSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const authUrl = getThreadsAuthUrl()
  return NextResponse.redirect(authUrl)
}
