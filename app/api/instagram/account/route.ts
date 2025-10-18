import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Instagram account for this user
    const instagramAccount = await prisma.instagramAccount.findFirst({
      where: {
        userId: session.user.id
      }
    })

    if (!instagramAccount) {
      return NextResponse.json({ error: 'No Instagram account connected' }, { status: 404 })
    }

    return NextResponse.json({
      username: instagramAccount.username || instagramAccount.instagramId,
      userId: instagramAccount.instagramId,
      profile_picture_url: instagramAccount.profilePictureUrl
    })
  } catch (error) {
    console.error('Get Instagram account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
