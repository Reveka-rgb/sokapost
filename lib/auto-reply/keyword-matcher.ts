import { prisma } from '@/lib/prisma'

export interface KeywordMatch {
  keywordId: string
  keyword: string
  replyText: string
  priority: number
}

/**
 * Find matching keyword untuk message text
 * 
 * @param userId - User ID
 * @param messageText - Text yang perlu di-match
 * @returns KeywordMatch atau null jika tidak ada yang match
 */
export async function findMatchingKeyword(
  userId: string,
  messageText: string
): Promise<KeywordMatch | null> {
  try {
    // Get all enabled keywords for user, ordered by priority
    const keywords = await prisma.keywordReply.findMany({
      where: {
        userId,
        enabled: true
      },
      orderBy: [
        { priority: 'desc' },  // Higher priority first
        { createdAt: 'asc' }   // Older first as tie-breaker
      ]
    })

    if (keywords.length === 0) {
      return null
    }

    // Normalize message text untuk case-insensitive matching
    const normalizedMessage = messageText.toLowerCase().trim()

    // Find first matching keyword
    for (const kw of keywords) {
      // Keyword bisa comma-separated untuk multiple variants
      // Example: "harga, price, berapa"
      const keywordVariants = kw.keyword
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0)

      // Check if any variant matches
      const isMatch = keywordVariants.some(variant => 
        normalizedMessage.includes(variant)
      )

      if (isMatch) {
        console.log(`✅ Keyword matched: "${kw.keyword}" for message: "${messageText}"`)
        
        // Update usage stats
        await prisma.keywordReply.update({
          where: { id: kw.id },
          data: {
            usedCount: { increment: 1 },
            lastUsedAt: new Date()
          }
        }).catch(err => {
          console.error('Failed to update keyword stats:', err)
          // Don't throw, just log - stats update failure shouldn't break reply
        })

        return {
          keywordId: kw.id,
          keyword: kw.keyword,
          replyText: kw.replyText,
          priority: kw.priority
        }
      }
    }

    console.log(`ℹ️ No keyword matched for message: "${messageText}"`)
    return null
  } catch (error) {
    console.error('Keyword matching error:', error)
    throw error
  }
}

/**
 * Check if message should be excluded based on exclude keywords
 * 
 * @param messageText - Message text
 * @param excludeKeywords - JSON string of exclude keywords array
 * @returns true if should be excluded
 */
export function shouldExcludeMessage(
  messageText: string,
  excludeKeywords?: string | null
): boolean {
  if (!excludeKeywords) {
    return false
  }

  try {
    const keywords = JSON.parse(excludeKeywords) as string[]
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return false
    }

    const normalizedMessage = messageText.toLowerCase().trim()

    // Check if any exclude keyword is present
    const shouldExclude = keywords.some(keyword => {
      const normalizedKeyword = keyword.toLowerCase().trim()
      return normalizedMessage.includes(normalizedKeyword)
    })

    if (shouldExclude) {
      console.log(`🚫 Message excluded due to keyword filter: "${messageText}"`)
    }

    return shouldExclude
  } catch (error) {
    console.error('Error parsing exclude keywords:', error)
    return false // Don't exclude on error
  }
}
