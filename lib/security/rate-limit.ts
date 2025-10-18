import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limit configurations
export const RATE_LIMITS = {
  ai: { requests: 10, window: 60 }, // 10 requests per minute
  post: { requests: 20, window: 3600 }, // 20 posts per hour
  upload: { requests: 30, window: 3600 }, // 30 uploads per hour
  auth: { requests: 5, window: 900 }, // 5 attempts per 15 minutes
  autoReply: { requests: 30, window: 3600 }, // 30 requests per hour
  general: { requests: 100, window: 60 }, // 100 requests per minute
  analytics: { requests: 1, window: 86400 }, // 1 request per day (24 hours)
} as const

export type RateLimitType = keyof typeof RATE_LIMITS

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

interface RateLimitHeaders {
  headers: {
    'X-RateLimit-Limit': string
    'X-RateLimit-Remaining': string
    'X-RateLimit-Reset': string
  }
}

// Initialize Redis client (optional - falls back to in-memory if not configured)
let redis: Redis | null = null
const rateLimiters: Map<RateLimitType, Ratelimit> = new Map()

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    // Create rate limiters for each type
    Object.entries(RATE_LIMITS).forEach(([key, config]) => {
      // Use sliding window for fair rate limiting (24 hours from first request)
      // This ensures users always get the full time window
      const limiter = new Ratelimit({
        redis: redis!,
        limiter: Ratelimit.slidingWindow(config.requests, `${config.window}s`),
        analytics: true,
        prefix: `ratelimit:${key}`,
      })
      rateLimiters.set(key as RateLimitType, limiter)
    })

    console.log('✅ Upstash Redis rate limiting enabled')
  } else {
    console.log('⚠️ Upstash Redis not configured, using in-memory rate limiting')
  }
} catch (error) {
  console.error('❌ Failed to initialize Upstash Redis:', error)
  console.log('⚠️ Falling back to in-memory rate limiting')
}

// In-memory fallback store
interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const memoryStore: RateLimitStore = {}

// Clean up expired entries periodically (in-memory only)
if (!redis) {
  setInterval(() => {
    const now = Date.now()
    Object.keys(memoryStore).forEach(key => {
      if (memoryStore[key].resetTime < now) {
        delete memoryStore[key]
      }
    })
  }, 60000) // Clean every minute
}

async function checkRateLimitWithRedis(
  identifier: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const limiter = rateLimiters.get(type)
  if (!limiter) {
    throw new Error(`Rate limiter for type ${type} not found`)
  }

  const result = await limiter.limit(identifier)
  const now = Math.floor(Date.now() / 1000)
  const config = RATE_LIMITS[type]
  
  // Upstash sometimes returns reset in milliseconds, convert to seconds
  let resetTime = result.reset
  if (resetTime > 9999999999) {
    resetTime = Math.floor(resetTime / 1000)
  }
  
  // Log for debugging
  console.log(`🔍 Rate Limit Check [${type}]:`, {
    now,
    resetFromUpstash: result.reset,
    resetConverted: resetTime,
    remaining: result.remaining,
    limit: result.limit,
    secondsUntilReset: resetTime - now,
    hoursUntilReset: ((resetTime - now) / 3600).toFixed(2)
  })

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: resetTime,
  }
}

async function checkRateLimitWithMemory(
  identifier: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[type]
  const now = Date.now()
  const key = `${type}:${identifier}`

  // Get or create entry
  if (!memoryStore[key] || memoryStore[key].resetTime < now) {
    memoryStore[key] = {
      count: 0,
      resetTime: now + config.window * 1000,
    }
  }

  const entry = memoryStore[key]
  entry.count++

  const remaining = Math.max(0, config.requests - entry.count)
  const isAllowed = entry.count <= config.requests

  return {
    success: isAllowed,
    limit: config.requests,
    remaining,
    reset: Math.ceil(entry.resetTime / 1000),
  }
}

export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'general'
): Promise<RateLimitResult> {
  if (redis && rateLimiters.has(type)) {
    return checkRateLimitWithRedis(identifier, type)
  }
  return checkRateLimitWithMemory(identifier, type)
}

export async function withRateLimit(
  req: NextRequest,
  type: RateLimitType,
  userId?: string
): Promise<RateLimitHeaders | NextResponse> {
  // Use userId if available, otherwise use IP
  const identifier = userId || req.ip || req.headers.get('x-forwarded-for') || 'unknown'
  
  const result = await checkRateLimit(identifier, type)

  const headers: RateLimitHeaders = {
    headers: {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toString(),
    },
  }

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again after ${new Date(result.reset * 1000).toLocaleString()}`,
      },
      {
        status: 429,
        headers: headers.headers,
      }
    )
  }

  return headers
}
