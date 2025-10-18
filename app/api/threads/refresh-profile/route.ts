import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { getThreadsProfile } from '@/lib/api/threads'
import { decryptToken } from '@/lib/utils/encryption'

export async function POST() {
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
        error: 'No Threads account connected' 
      }, { status: 404 })
    }

    // Decrypt access token
    const accessToken = decryptToken(threadsAccount.accessToken)

    // Fetch latest profile from Threads API
    const profile = await getThreadsProfile(accessToken)

    // Update database with latest info
    await prisma.threadsAccount.update({
      where: { userId: session.user.id },
      data: {
        username: profile.username,
        profilePictureUrl: profile.threads_profile_picture_url
      }
    })

    return NextResponse.json({
      success: true,
      username: profile.username,
      profilePictureUrl: profile.threads_profile_picture_url
    })
  } catch (error: any) {
    console.error('Refresh profile error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh profile' },
      { status: 500 }
    )
  }
}
