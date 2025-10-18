import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { getInstagramAuthUrl } from '@/lib/api/instagram'

export async function GET() {
  const session = await getServerSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const authUrl = getInstagramAuthUrl()
  return NextResponse.redirect(authUrl)
}
