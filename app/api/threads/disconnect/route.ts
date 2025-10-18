import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session = await getServerSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.threadsAccount.deleteMany({
      where: { userId: session.user.id }
    })

    return NextResponse.redirect(new URL('/settings?success=threads_disconnected', process.env.NEXTAUTH_URL!))
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
