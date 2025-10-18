import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/utils/encryption'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { withRateLimit } from '@/lib/security/rate-limit'
import { handleApiError, createApiError } from '@/lib/security/error-handler'
import axios from 'axios'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const THREADS_API_BASE = 'https://graph.threads.net/v1.0'

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      throw createApiError('UNAUTHORIZED')
    }

    // Apply rate limiting (1 request per day / 24 hours)
    const rateLimitResult = await withRateLimit(req, 'analytics', session.user.id)
    if ('status' in rateLimitResult) {
      return rateLimitResult
    }

    // Get Threads account
    const threadsAccount = await prisma.threadsAccount.findUnique({
      where: { userId: session.user.id }
    })

    if (!threadsAccount) {
      throw createApiError('BAD_REQUEST', { message: 'Threads account not connected' })
    }

    // Calculate date range (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const today = new Date()
    
    // Format dates as YYYY-MM-DD for API
    const since = thirtyDaysAgo.toISOString().split('T')[0]
    const until = today.toISOString().split('T')[0]

    const accessToken = decryptToken(threadsAccount.accessToken)

    // Step 1: Get account-level insights
    let accountInsights: any = {}
    try {
      const insightsResponse = await axios.get(
        `${THREADS_API_BASE}/${threadsAccount.threadsUserId}/threads_insights`,
        {
          params: {
            metric: 'views,likes,replies,reposts,quotes,followers_count',
            since: since,
            until: until,
            access_token: accessToken
          }
        }
      )

      const data = insightsResponse.data.data || []
      accountInsights = data.reduce((acc: any, item: any) => {
        // Different metrics have different response formats:
        // - views: has "values" array (per day)
        // - likes, replies, reposts, quotes, followers_count: has "total_value.value"
        if (item.values && Array.isArray(item.values)) {
          const totalValue = item.values.reduce((sum: number, v: any) => sum + (v.value || 0), 0)
          acc[item.name] = totalValue
        } else if (item.total_value?.value !== undefined) {
          acc[item.name] = item.total_value.value
        } else {
          acc[item.name] = 0
        }
        return acc
      }, {})
    } catch (error: any) {
      console.error('[Smart Analytics] Failed to fetch account insights:', error.response?.data || error.message)
    }

    // Step 2: Get user's threads for detailed analysis
    let allThreads: any[] = []
    try {
      const threadsResponse = await axios.get(
        `${THREADS_API_BASE}/${threadsAccount.threadsUserId}/threads`,
        {
          params: {
            fields: 'id,text,timestamp,media_type,media_url,permalink',
            limit: 100,
            access_token: accessToken
          }
        }
      )

      allThreads = threadsResponse.data.data || []
      
      // Filter threads from last 30 days
      const thirtyDaysAgoTimestamp = thirtyDaysAgo.getTime()
      allThreads = allThreads.filter((thread: any) => {
        const threadTimestamp = new Date(thread.timestamp).getTime()
        return threadTimestamp >= thirtyDaysAgoTimestamp
      })
    } catch (error: any) {
      console.error('[Smart Analytics] Failed to fetch threads:', error.response?.data || error.message)
      throw createApiError('SERVICE_UNAVAILABLE')
    }

    const posts = allThreads

    if (posts.length === 0) {
      return NextResponse.json(
        {
          overview: {
            totalPosts: 0,
            totalViews: 0,
            totalLikes: 0,
            totalReplies: 0,
            totalReposts: 0,
            avgEngagement: 0,
            periodDays: 30
          },
          topPosts: [],
          aiRecommendations: {
            summary: 'No posts published in the last 30 days. Start posting to get AI-powered insights!',
            bestTimes: [],
            contentTips: ['Publish your first post to get started'],
            improvements: []
          },
          chartData: []
        },
        { headers: rateLimitResult.headers }
      )
    }

    // Step 2: Fetch insights for each thread
    const postsWithInsights = await Promise.all(
      posts.map(async (thread: any) => {
        try {
          const response = await axios.get(
            `${THREADS_API_BASE}/${thread.id}/insights`,
            {
              params: {
                metric: 'views,likes,replies,reposts,quotes',
                access_token: accessToken
              }
            }
          )

          const metrics = response.data.data.reduce((acc: any, item: any) => {
            acc[item.name] = item.values[0]?.value || 0
            return acc
          }, {})

          const likes = metrics.likes || 0
          const replies = metrics.replies || 0
          const reposts = metrics.reposts || 0
          const quotes = metrics.quotes || 0
          const views = metrics.views || 0
          
          const totalEngagement = likes + replies + reposts + quotes
          const engagement = views > 0 ? (totalEngagement / views) * 100 : 0

          return {
            id: thread.id,
            content: thread.text || '',
            views: views,
            likes: likes,
            replies: replies,
            reposts: reposts + quotes,
            totalEngagement: totalEngagement,
            engagement: parseFloat(engagement.toFixed(2)),
            publishedAt: new Date(thread.timestamp),
            contentLength: (thread.text || '').length,
            hasMedia: thread.media_type ? true : false
          }
        } catch (error) {
          // Return with zero metrics if insights fail
          return {
            id: thread.id,
            content: thread.text || '',
            views: 0,
            likes: 0,
            replies: 0,
            reposts: 0,
            engagement: 0,
            publishedAt: new Date(thread.timestamp),
            contentLength: (thread.text || '').length,
            hasMedia: thread.media_type ? true : false
          }
        }
      })
    )

    // Filter out null posts and posts with no views (reposts without data)
    const validPosts = postsWithInsights.filter(p => p !== null && p.views > 0)

    // Calculate metrics from account insights (more accurate)
    const totalViews = accountInsights.views || validPosts.reduce((sum, p) => sum + p.views, 0)
    const totalLikes = accountInsights.likes || validPosts.reduce((sum, p) => sum + p.likes, 0)
    const totalReplies = accountInsights.replies || validPosts.reduce((sum, p) => sum + p.replies, 0)
    const totalReposts = (accountInsights.reposts || 0) + (accountInsights.quotes || 0) || validPosts.reduce((sum, p) => sum + p.reposts, 0)
    
    const totalEngagement = totalLikes + totalReplies + totalReposts
    const avgEngagement = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0

    const overview = {
      totalPosts: validPosts.length,
      totalViews: totalViews,
      totalLikes: totalLikes,
      totalReplies: totalReplies,
      totalReposts: totalReposts,
      avgEngagement: avgEngagement,
      periodDays: 30,
      followersCount: accountInsights.followers_count || 0
    }

    // Sort by total engagement (likes + replies + reposts) for top posts
    const topPosts = [...validPosts].sort((a, b) => b.totalEngagement - a.totalEngagement)

    // Prepare data for AI analysis
    const analysisData = {
      totalPosts: validPosts.length,
      avgEngagement: overview.avgEngagement,
      topPerforming: topPosts.slice(0, 5).map(p => ({
        content: p.content.substring(0, 100),
        engagement: p.engagement,
        views: p.views,
        likes: p.likes,
        contentLength: p.contentLength,
        hasMedia: p.hasMedia,
        hour: new Date(p.publishedAt).getHours()
      })),
      bottomPerforming: topPosts.slice(-5).map(p => ({
        content: p.content.substring(0, 100),
        engagement: p.engagement,
        views: p.views,
        contentLength: p.contentLength,
        hasMedia: p.hasMedia
      })),
      postingPatterns: {
        avgContentLength: validPosts.reduce((sum, p) => sum + p.contentLength, 0) / validPosts.length,
        postsWithMedia: validPosts.filter(p => p.hasMedia).length,
        postsWithoutMedia: validPosts.filter(p => !p.hasMedia).length
      }
    }

    // AI Analysis with Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `Kamu adalah ahli analisa media sosial. Analisa data performa Threads berikut dan berikan insight yang actionable dalam Bahasa Indonesia.

DATA:
- Total Posts: ${analysisData.totalPosts}
- Rata-rata Engagement Rate: ${analysisData.avgEngagement.toFixed(2)}%
- Posts dengan Media: ${analysisData.postingPatterns.postsWithMedia}
- Posts tanpa Media: ${analysisData.postingPatterns.postsWithoutMedia}
- Rata-rata Panjang Konten: ${analysisData.postingPatterns.avgContentLength.toFixed(0)} karakter

POST DENGAN PERFORMA TERBAIK:
${analysisData.topPerforming.map((p, i) => `${i + 1}. Engagement: ${p.engagement.toFixed(1)}%, Views: ${p.views}, Likes: ${p.likes}, Panjang: ${p.contentLength} chars, Media: ${p.hasMedia ? 'Ya' : 'Tidak'}, Posted jam: ${p.hour}:00`).join('\n')}

POST DENGAN PERFORMA TERBURUK:
${analysisData.bottomPerforming.map((p, i) => `${i + 1}. Engagement: ${p.engagement.toFixed(1)}%, Views: ${p.views}, Panjang: ${p.contentLength} chars, Media: ${p.hasMedia ? 'Ya' : 'Tidak'}`).join('\n')}

Berikan response dalam format JSON ini:
{
  "summary": "Ringkasan performa keseluruhan dalam 2-3 kalimat",
  "bestTimes": ["rekomendasi waktu 1", "rekomendasi waktu 2"],
  "contentTips": ["tips konten 1", "tips konten 2", "tips konten 3"],
  "contentIdeas": ["ide konten 1", "ide konten 2", "ide konten 3", "ide konten 4"],
  "improvements": ["area improvement 1", "area improvement 2", "area improvement 3"]
}

Fokus pada:
1. Waktu posting terbaik berdasarkan pola post dengan engagement tinggi
2. Strategi konten (panjang text, penggunaan media)
3. Ide konten spesifik yang bisa dicoba
4. Improvement yang konkrit dan actionable
5. Gunakan bahasa yang friendly dan mudah dipahami

Return ONLY valid JSON, tanpa markdown formatting.`

    const result = await model.generateContent(prompt)
    const aiResponseText = result.response.text()
    
    // Parse AI response
    let aiRecommendations
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = aiResponseText.match(/```json\n([\s\S]*?)\n```/) || 
                       aiResponseText.match(/```\n([\s\S]*?)\n```/)
      const jsonText = jsonMatch ? jsonMatch[1] : aiResponseText
      aiRecommendations = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponseText)
      aiRecommendations = {
        summary: 'Analisa selesai. Periksa post dengan performa terbaik untuk melihat pola.',
        bestTimes: ['Pagi (8-10 pagi)', 'Sore (6-8 malam)'],
        contentTips: [
          'Post dengan media cenderung lebih engaging',
          'Jaga panjang konten antara 100-200 karakter',
          'Balas komentar untuk meningkatkan visibilitas'
        ],
        contentIdeas: [
          'Buat thread tentang tips & trik di niche Anda',
          'Share behind the scenes dari daily routine',
          'Ajukan pertanyaan untuk meningkatkan interaksi',
          'Bagikan personal story yang relatable'
        ],
        improvements: [
          'Tingkatkan frekuensi posting',
          'Coba berbagai jenis konten',
          'Post di jam dengan engagement tinggi'
        ]
      }
    }

    // Chart data
    const chartData = validPosts.map(post => ({
      date: new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      engagement: post.engagement
    })).reverse()

    return NextResponse.json(
      {
        overview,
        topPosts,
        aiRecommendations,
        chartData
      },
      { headers: rateLimitResult.headers }
    )

  } catch (error: any) {
    return handleApiError(error)
  }
}
