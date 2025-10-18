import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/utils/encryption'
import { handleApiError, createApiError } from '@/lib/security/error-handler'
import { GoogleGenerativeAI } from '@google/generative-ai'
import axios from 'axios'

const THREADS_API_BASE = 'https://graph.threads.net/v1.0'
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      throw createApiError('UNAUTHORIZED')
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
    console.log(`[Smart Analytics] Fetching account insights from ${since} to ${until}`)

    // Step 1: Get account-level insights (more accurate)
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

      // Parse account insights
      const data = insightsResponse.data.data || []
      
      accountInsights = data.reduce((acc: any, item: any) => {
        // Different metrics have different response formats:
        // - views: has "values" array (per day)
        // - likes, replies, reposts, quotes, followers_count: has "total_value.value"
        if (item.values && Array.isArray(item.values)) {
          // Sum up all values in the period (for views)
          const totalValue = item.values.reduce((sum: number, v: any) => sum + (v.value || 0), 0)
          acc[item.name] = totalValue
        } else if (item.total_value?.value !== undefined) {
          // Use total_value directly (for likes, replies, etc)
          acc[item.name] = item.total_value.value
        } else {
          acc[item.name] = 0
        }
        return acc
      }, {})

      console.log(`[Smart Analytics] Parsed account insights:`, accountInsights)
      console.log(`[Smart Analytics] Date range: ${since} to ${until}`)
    } catch (error: any) {
      console.error('[Smart Analytics] Failed to fetch account insights:', error.response?.data || error.message)
    }

    // Step 2: Get user's threads for top posts analysis
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

      console.log(`[Smart Analytics] ${allThreads.length} threads from last 30 days`)
    } catch (error: any) {
      console.error('[Smart Analytics] Failed to fetch threads:', error.response?.data || error.message)
      throw createApiError('SERVICE_UNAVAILABLE')
    }

    if (allThreads.length === 0) {
      return NextResponse.json({
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
      })
    }

    // Step 2: Fetch insights for each thread
    const postsWithInsights = await Promise.all(
      allThreads.map(async (thread) => {
        try {
          console.log(`[Smart Analytics] Fetching insights for thread ${thread.id}`)
          
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

          console.log(`[Smart Analytics] Thread ${thread.id} detailed metrics:`, {
            views,
            likes,
            replies,
            reposts,
            quotes,
            totalEngagement,
            calculatedRate: engagement,
            roundedRate: parseFloat(engagement.toFixed(2))
          })

          return {
            id: thread.id,
            threadsPostId: thread.id,
            content: thread.text || '',
            views: views,
            likes: likes,
            replies: replies,
            reposts: reposts + quotes,
            totalEngagement: totalEngagement,
            engagement: parseFloat(engagement.toFixed(2)),
            createdAt: thread.timestamp
          }
        } catch (error: any) {
          console.error(`[Smart Analytics] Failed to fetch insights for thread ${thread.id}:`, error.response?.data || error.message)
          // Return with zero metrics if insights fail
          return {
            id: thread.id,
            threadsPostId: thread.id,
            content: thread.text || '',
            views: 0,
            likes: 0,
            replies: 0,
            reposts: 0,
            engagement: 0,
            createdAt: thread.timestamp
          }
        }
      })
    )

    // Filter out null posts and posts with no views (reposts without data)
    const validPosts = postsWithInsights.filter(p => p !== null && p.views > 0)
    console.log(`[Smart Analytics] Valid posts with insights: ${validPosts.length}`)

    // Calculate overview metrics from account insights (more accurate)
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

    // Generate chart data (engagement over time)
    const chartData = validPosts.map(post => ({
      date: new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      engagement: post.engagement
    })).reverse()

    return NextResponse.json({
      overview,
      topPosts,
      aiRecommendations: null, // Will be populated by analyze endpoint
      chartData
    })

  } catch (error: any) {
    return handleApiError(error)
  }
}
