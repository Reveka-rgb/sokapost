import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getServerSession } from '@/lib/auth-api'
import { withRateLimit } from '@/lib/security/rate-limit'
import { handleApiError, createApiError } from '@/lib/security/error-handler'
import { aiGenerateSchema } from '@/lib/security/validation-schemas'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Sleep helper for retry delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Check if it's a 503 or rate limit error
      const is503 = error.status === 503 || error.message?.includes('overloaded') || error.message?.includes('503')
      const isRateLimit = error.status === 429 || error.message?.includes('rate limit') || error.message?.includes('429')
      
      // Only retry on 503 or rate limit errors
      if (!is503 && !isRateLimit) {
        throw error
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)
      console.log(`⏳ API overloaded, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`)
      await sleep(delay)
    }
  }
  
  // All retries failed
  throw lastError
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      throw createApiError('UNAUTHORIZED')
    }

    // Apply rate limiting (10 requests per minute)
    const rateLimitResult = await withRateLimit(req, 'ai', session.user.id)
    if ('status' in rateLimitResult) {
      return rateLimitResult
    }

    // Validate input
    const body = await req.json()
    const { prompt } = aiGenerateSchema.parse(body)

    if (!process.env.GEMINI_API_KEY) {
      throw createApiError('SERVICE_UNAVAILABLE')
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

    // Create a better prompt for social media content
    const enhancedPrompt = `Kamu adalah kreator konten media sosial. Buat postingan menarik untuk Threads/Instagram berdasarkan permintaan ini:

${prompt}

Panduan:
- Maksimal 500 karakter
- Buat menarik dan natural
- Jangan menggunakan emoji
- Jangan pakai hashtag kecuali diminta
- Tulis dengan gaya conversational

PENTING: Langsung tulis konten postingannya saja, JANGAN tambahkan prefix seperti "Okay, here's...", "Berikut adalah...", "Ini dia...", atau pengantar lainnya. Langsung mulai dari konten utama.`

    // Generate content with retry logic
    const result = await retryWithBackoff(
      () => model.generateContent(enhancedPrompt),
      3,  // max 3 retries
      2000  // start with 2 second delay
    )
    
    const response = await result.response
    let text = response.text().trim()

    // Remove common prefixes that AI might add
    const prefixesToRemove = [
      /^Okay,?\s+here'?s?.*?:\s*/i,
      /^Here'?s?\s+.*?:\s*/i,
      /^Berikut\s+.*?:\s*/i,
      /^Ini\s+dia\s+.*?:\s*/i,
      /^Oke,?\s+.*?:\s*/i,
      /^Baik,?\s+.*?:\s*/i,
      /^Sure,?\s+.*?:\s*/i,
    ]

    for (const prefix of prefixesToRemove) {
      text = text.replace(prefix, '')
    }

    return NextResponse.json(
      { 
        success: true,
        content: text.trim()
      },
      { headers: rateLimitResult.headers }
    )

  } catch (error: any) {
    // Handle Gemini API specific errors
    if (error.status === 503 || error.message?.includes('overloaded')) {
      throw createApiError('SERVICE_UNAVAILABLE')
    }
    
    return handleApiError(error)
  }
}
