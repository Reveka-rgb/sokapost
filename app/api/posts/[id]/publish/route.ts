import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { publishThreadsPost } from '@/lib/api/threads'
import { publishInstagramPost, publishInstagramCarousel } from '@/lib/api/instagram'
import { decryptToken } from '@/lib/utils/encryption'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const post = await prisma.post.findFirst({
      where: { 
        id: params.id,
        userId: session.user.id 
      }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if already published
    if (post.status === 'published') {
      return NextResponse.json({ error: 'Post already published' }, { status: 400 })
    }

    const mediaUrls = post.mediaUrls ? JSON.parse(post.mediaUrls) : []

    console.log('Manual publish attempt:', {
      postId: post.id,
      platform: post.platform,
      content: post.content.substring(0, 50),
      hasMedia: mediaUrls.length > 0,
      mediaCount: mediaUrls.length,
      topic: post.topic || 'none',
      location: post.location || 'none'
    })

    let postId: string | null = null

    // Publish based on platform
    if (post.platform === 'threads') {
      // Get Threads account
      const threadsAccount = await prisma.threadsAccount.findUnique({
        where: { userId: session.user.id }
      })
      
      if (!threadsAccount) {
        return NextResponse.json({ error: 'No Threads account connected' }, { status: 400 })
      }

      const accessToken = decryptToken(threadsAccount.accessToken)

      postId = await publishThreadsPost({
        accessToken,
        userId: threadsAccount.threadsUserId,
        text: post.content,
        mediaUrls,
        topicTag: post.topic || undefined,
        linkAttachment: undefined
      })

      // Update post status
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: 'published',
          publishedAt: new Date(),
          threadsPostId: postId
        }
      })
    } else if (post.platform === 'instagram') {
      // Get Instagram account
      const instagramAccount = await prisma.instagramAccount.findFirst({
        where: { userId: session.user.id }
      })
      
      if (!instagramAccount) {
        return NextResponse.json({ error: 'No Instagram account connected' }, { status: 400 })
      }

      if (mediaUrls.length === 0) {
        return NextResponse.json({ error: 'Instagram posts require at least one image' }, { status: 400 })
      }

      const accessToken = decryptToken(instagramAccount.accessToken)

      // Use carousel for multiple images, single post for one image
      if (mediaUrls.length > 1) {
        const result = await publishInstagramCarousel(
          instagramAccount.instagramId,
          accessToken,
          {
            caption: post.content,
            imageUrls: mediaUrls
          }
        )
        postId = result.id
      } else {
        const result = await publishInstagramPost(
          instagramAccount.instagramId,
          accessToken,
          {
            caption: post.content,
            imageUrl: mediaUrls[0]
          }
        )
        postId = result.id
      }

      // Update post status
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: 'published',
          publishedAt: new Date(),
          instagramPostId: postId
        }
      })
    } else {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      postId,
      platform: post.platform,
      message: `Post published successfully to ${post.platform}`
    })
  } catch (error: any) {
    console.error('Manual publish error:', error)
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    })

    // Update post status to failed
    try {
      await prisma.post.update({
        where: { id: params.id },
        data: {
          status: 'failed',
          errorMessage: error.message || 'Unknown error'
        }
      })
    } catch (updateError) {
      console.error('Failed to update post status:', updateError)
    }

    return NextResponse.json(
      { 
        error: 'Failed to publish post',
        message: error.message,
        details: error.response?.data
      },
      { status: 500 }
    )
  }
}
