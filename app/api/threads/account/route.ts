import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Threads account
    const threadsAccount = await prisma.threadsAccount.findUnique({
      where: { userId: session.user.id }
    })

    if (!threadsAccount) {
      return NextResponse.json({ 
        error: 'No Threads account connected',
        connected: false 
      }, { status: 404 })
    }

    return NextResponse.json({
      connected: true,
      username: threadsAccount.username,
      threadsUserId: threadsAccount.threadsUserId,
      profile_picture_url: threadsAccount.profilePictureUrl
    })
  } catch (error: any) {
    console.error('Get Threads account error:', error)
    return NextResponse.json(
      { error: 'Failed to get account info' },
      { status: 500 }
    )
  }
}
