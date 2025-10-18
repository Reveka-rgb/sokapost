import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { Redis } from '@upstash/redis'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
    }

    const body = await req.json()
    const { type } = body // e.g., 'analytics', 'ai', 'post', etc.

    if (!type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 })
    }

    // Check if Redis is configured
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return NextResponse.json({ 
        error: 'Redis not configured, using in-memory (restart server to reset)' 
      }, { status: 400 })
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    // Delete the rate limit key for this user
    const key = `ratelimit:${type}:${session.user.id}`
    await redis.del(key)

    console.log(`✅ Reset rate limit for user ${session.user.id}, type: ${type}`)

    return NextResponse.json({ 
      success: true, 
      message: `Rate limit reset for ${type}`,
      key 
    })
  } catch (error: any) {
    console.error('Reset rate limit error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to reset rate limit' 
    }, { status: 500 })
  }
}
