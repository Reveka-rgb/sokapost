import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { getUserThreadsPosts } from '@/lib/api/threads'
import { decryptToken } from '@/lib/utils/encryption'

// GET - Get user's Threads posts (from Threads API)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Threads account
    const threadsAccount = await prisma.threadsAccount.findUnique({
      where: { userId: session.user.id }
    })

    if (!threadsAccount) {
      return NextResponse.json(
        { error: 'Threads account not connected' },
        { status: 400 }
      )
    }

    // Decrypt access token
    const decryptedToken = decryptToken(threadsAccount.accessToken)

    // Fetch posts from Threads API
    const response = await getUserThreadsPosts({
      accessToken: decryptedToken,
      userId: threadsAccount.threadsUserId,
      limit: 50 // Max 50 posts
    })

    // Format posts for UI
    const posts = response.data.map((post: any) => ({
      id: post.id,
      text: post.text || '',
      timestamp: post.timestamp,
      permalink: post.permalink,
      media_type: post.media_type,
      media_url: post.media_url,
      has_replies: post.has_replies || false
    }))

    return NextResponse.json({
      success: true,
      posts,
      total: posts.length
    })
  } catch (error: any) {
    console.error('Fetch Threads posts error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}
