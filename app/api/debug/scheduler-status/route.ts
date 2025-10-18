import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { getSchedulerStatus } from '@/lib/services/scheduler'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    
    // Get all scheduled posts
    const scheduledPosts = await prisma.post.findMany({
      where: {
        userId: session.user.id,
        status: 'scheduled'
      },
      orderBy: { scheduledAt: 'asc' }
    })

    // Get posts that should have been published
    const overduePosts = await prisma.post.findMany({
      where: {
        userId: session.user.id,
        status: 'scheduled',
        scheduledAt: { lte: now }
      }
    })

    // Get recent posts (last 10)
    const recentPosts = await prisma.post.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    const schedulerStatus = getSchedulerStatus()

    return NextResponse.json({
      scheduler: {
        running: schedulerStatus.running,
        currentTime: now.toISOString()
      },
      posts: {
        totalScheduled: scheduledPosts.length,
        overdue: overduePosts.length,
        scheduledPosts: scheduledPosts.map(p => ({
          id: p.id,
          content: p.content.substring(0, 50) + '...',
          status: p.status,
          scheduledAt: p.scheduledAt?.toISOString(),
          createdAt: p.createdAt.toISOString(),
          isPast: p.scheduledAt ? p.scheduledAt <= now : false
        })),
        recentPosts: recentPosts.map(p => ({
          id: p.id,
          content: p.content.substring(0, 50) + '...',
          status: p.status,
          scheduledAt: p.scheduledAt?.toISOString(),
          publishedAt: p.publishedAt?.toISOString(),
          createdAt: p.createdAt.toISOString(),
          errorMessage: p.errorMessage
        }))
      }
    })
  } catch (error) {
    console.error('Scheduler status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
