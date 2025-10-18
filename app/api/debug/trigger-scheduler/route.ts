import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { publishThreadsPost } from '@/lib/api/threads'
import { decryptToken } from '@/lib/utils/encryption'

export async function POST() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    console.log(`🔄 Manual scheduler trigger at ${now.toISOString()}`)
    
    // Find posts that need to be published
    const postsToPublish = await prisma.post.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now }
      },
      include: {
        user: {
          include: {
            threadsAccounts: true,
            instagramAccounts: true
          }
        }
      }
    })

    console.log(`📝 Found ${postsToPublish.length} posts to publish`)

    const results = []

    for (const post of postsToPublish) {
      console.log(`📤 Processing post ${post.id}:`, {
        content: post.content.substring(0, 50) + '...',
        scheduledAt: post.scheduledAt,
        platform: post.platform,
        hasMedia: !!post.mediaUrls
      })

      try {
        let postId: string | null = null

        if (post.platform === 'threads') {
          const account = post.user.threadsAccounts[0]
          if (!account) {
            throw new Error('No Threads account connected')
          }

          const accessToken = decryptToken(account.accessToken)
          const mediaUrls = post.mediaUrls ? JSON.parse(post.mediaUrls) : []

          postId = await publishThreadsPost({
            accessToken,
            userId: account.threadsUserId,
            text: post.content,
            mediaUrls,
            topicTag: post.topic || undefined,
            linkAttachment: undefined
          })

          await prisma.post.update({
            where: { id: post.id },
            data: {
              status: 'published',
              publishedAt: new Date(),
              threadsPostId: postId
            }
          })

          console.log(`✅ Published post ${post.id} to Threads`)
          
          results.push({
            postId: post.id,
            success: true,
            threadsPostId: postId
          })
        } else if (post.platform === 'instagram') {
          console.log(`⚠️ Instagram publishing not yet implemented for post ${post.id}`)
          results.push({
            postId: post.id,
            success: false,
            error: 'Instagram not implemented'
          })
        }
      } catch (error: any) {
        console.error(`❌ Failed to publish post ${post.id}:`, error)
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          stack: error.stack
        })
        
        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        })

        results.push({
          postId: post.id,
          success: false,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      message: 'Scheduler triggered manually',
      postsFound: postsToPublish.length,
      results
    })
  } catch (error) {
    console.error('Manual trigger error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
