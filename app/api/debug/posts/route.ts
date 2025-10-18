import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const posts = await prisma.post.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        status: true,
        scheduledAt: true,
        publishedAt: true,
        createdAt: true,
        topic: true,
        location: true,
      }
    })

    return NextResponse.json({ 
      posts,
      debug: {
        count: posts.length,
        scheduled: posts.filter(p => p.scheduledAt !== null).length,
        published: posts.filter(p => p.publishedAt !== null).length,
      }
    }, { status: 200 })
  } catch (error) {
    console.error('Debug posts error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
