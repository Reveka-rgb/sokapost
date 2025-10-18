import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/security/rate-limit'
import { handleApiError, createApiError } from '@/lib/security/error-handler'
import { createPostSchema } from '@/lib/security/validation-schemas'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      throw createApiError('UNAUTHORIZED')
    }

    const posts = await prisma.post.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ posts })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      throw createApiError('UNAUTHORIZED')
    }

    // Apply rate limiting (20 posts per hour)
    const rateLimitResult = await withRateLimit(request, 'post', session.user.id)
    if ('status' in rateLimitResult) {
      return rateLimitResult
    }

    // Validate input
    const body = await request.json()
    const { content, platform, scheduledAt, mediaUrls, publishImmediately, status, topic, location } = createPostSchema.parse(body)

    // Determine post status
    let postStatus: 'draft' | 'scheduled' | 'published' = 'draft'
    let scheduleDate: Date | null = null

    if (status) {
      postStatus = status
      // If status is explicitly 'scheduled', we MUST have scheduledAt
      if (status === 'scheduled' && scheduledAt) {
        scheduleDate = new Date(scheduledAt)
      }
    } else if (publishImmediately) {
      // Schedule for immediate publish (1 minute from now)
      postStatus = 'scheduled'
      scheduleDate = new Date(Date.now() + 60000) // 1 minute from now
    } else if (scheduledAt) {
      postStatus = 'scheduled'
      scheduleDate = new Date(scheduledAt)
    }

    const post = await prisma.post.create({
      data: {
        userId: session.user.id,
        content,
        platform,
        mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
        status: postStatus,
        scheduledAt: scheduleDate,
        topic: topic || null,
        location: location || null,
      },
    })

    return NextResponse.json(
      { post },
      { headers: rateLimitResult.headers }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
