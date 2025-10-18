import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch both accounts in parallel
    const [threadsAccount, instagramAccount] = await Promise.all([
      prisma.threadsAccount.findUnique({
        where: { userId: session.user.id },
        select: {
          username: true,
          profilePictureUrl: true,
          threadsUserId: true,
          createdAt: true
        }
      }),
      prisma.instagramAccount.findFirst({
        where: { userId: session.user.id },
        select: {
          username: true,
          profilePictureUrl: true,
          instagramId: true,
          createdAt: true
        }
      })
    ])

    return NextResponse.json({
      threads: threadsAccount ? {
        connected: true,
        username: threadsAccount.username,
        profile_picture_url: threadsAccount.profilePictureUrl,
        userId: threadsAccount.threadsUserId,
        createdAt: threadsAccount.createdAt
      } : {
        connected: false
      },
      instagram: instagramAccount ? {
        connected: true,
        username: instagramAccount.username,
        profile_picture_url: instagramAccount.profilePictureUrl,
        userId: instagramAccount.instagramId,
        createdAt: instagramAccount.createdAt
      } : {
        connected: false
      }
    })
  } catch (error) {
    console.error('Get accounts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}
