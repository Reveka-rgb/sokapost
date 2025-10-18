import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSystemPrompt } from './default-prompt'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Sleep helper for retry delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
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
      console.log(`⏳ AI overloaded, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`)
      await sleep(delay)
    }
  }
  
  // All retries failed
  throw lastError
}

export interface GenerateReplyParams {
  // Message yang perlu dibalas
  messageText: string
  
  // Context dari user
  fromUsername: string
  
  // Original post context (optional)
  originalPostText?: string
  
  // Custom prompt (if user has one)
  customPrompt?: string | null
  
  // Previous conversation context (optional, untuk lebih smart)
  conversationHistory?: Array<{
    from: string
    text: string
  }>
}

export async function generateAIReply(params: GenerateReplyParams): Promise<string> {
  const {
    messageText,
    fromUsername,
    originalPostText,
    customPrompt,
    conversationHistory = []
  } = params

  // Get system prompt (custom or default)
  const systemPrompt = getSystemPrompt(customPrompt)

  // Build user prompt with context
  let userPrompt = `Kamu harus membalas komentar berikut dari @${fromUsername}:\n\n`
  userPrompt += `"${messageText}"\n\n`

  if (originalPostText) {
    userPrompt += `Konteks: Mereka berkomentar di post kamu yang berbunyi:\n"${originalPostText}"\n\n`
  }

  if (conversationHistory.length > 0) {
    userPrompt += `Riwayat percakapan sebelumnya:\n`
    conversationHistory.forEach(msg => {
      userPrompt += `- ${msg.from}: "${msg.text}"\n`
    })
    userPrompt += `\n`
  }

  userPrompt += `Balas dengan natural dan sesuai konteks. Ingat: Singkat, jelas, dan friendly!`

  console.log('🤖 Generating AI reply...')
  console.log('System Prompt:', systemPrompt.substring(0, 100) + '...')
  console.log('User Prompt:', userPrompt)

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-lite',
      systemInstruction: systemPrompt
    })

    // Generate with retry logic
    const result = await retryWithBackoff(
      () => model.generateContent(userPrompt),
      3,
      2000
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

    console.log('✅ AI Reply generated:', text)
    return text.trim()
  } catch (error: any) {
    console.error('❌ AI generation error:', error)
    
    // User-friendly error messages
    let errorMessage = 'Failed to generate AI reply'
    
    if (error.status === 503 || error.message?.includes('overloaded')) {
      errorMessage = 'AI service is currently overloaded'
    } else if (error.status === 429) {
      errorMessage = 'Rate limit reached'
    } else if (error.message?.includes('API key')) {
      errorMessage = 'API key error'
    }
    
    throw new Error(errorMessage)
  }
}
