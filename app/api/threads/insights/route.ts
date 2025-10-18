import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/utils/encryption'
import axios from 'axios'

const THREADS_API_BASE = 'https://graph.threads.net/v1.0'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Threads account
    const threadsAccount = await prisma.threadsAccount.findUnique({
      where: { userId: session.user.id }
    })

    if (!threadsAccount) {
      return NextResponse.json({ 
        error: 'No Threads account connected',
        connected: false 
      }, { status: 404 })
    }

    const accessToken = decryptToken(threadsAccount.accessToken)

    // Get user's media (posts)
    const mediaResponse = await axios.get(`${THREADS_API_BASE}/${threadsAccount.threadsUserId}/threads`, {
      params: {
        fields: 'id,media_type,media_url,text,timestamp,permalink',
        limit: 25,
        access_token: accessToken
      }
    })

    const media = mediaResponse.data.data || []

    // Get insights for each post
    let totalViews = 0
    let totalLikes = 0
    let totalReplies = 0
    let totalReposts = 0
    let totalQuotes = 0
    
    const postsWithInsights = await Promise.all(
      media.map(async (post: any) => {
        try {
          // Get insights for this post
          const insightsResponse = await axios.get(`${THREADS_API_BASE}/${post.id}/insights`, {
            params: {
              metric: 'views,likes,replies,reposts,quotes',
              access_token: accessToken
            }
          })

          const insights = insightsResponse.data.data || []
          const insightsMap: any = {}
          
          insights.forEach((insight: any) => {
            insightsMap[insight.name] = insight.values[0]?.value || 0
          })

          // Accumulate totals
          totalViews += insightsMap.views || 0
          totalLikes += insightsMap.likes || 0
          totalReplies += insightsMap.replies || 0
          totalReposts += insightsMap.reposts || 0
          totalQuotes += insightsMap.quotes || 0

          return {
            id: post.id,
            text: post.text,
            timestamp: post.timestamp,
            permalink: post.permalink,
            media_url: post.media_url,
            media_type: post.media_type,
            insights: insightsMap
          }
        } catch (error) {
          // If insights fail for a post, return post without insights
          return {
            id: post.id,
            text: post.text,
            timestamp: post.timestamp,
            permalink: post.permalink,
            media_url: post.media_url,
            media_type: post.media_type,
            insights: {}
          }
        }
      })
    )

    // Get user profile for followers count
    let followersCount = 0
    try {
      const profileResponse = await axios.get(`${THREADS_API_BASE}/${threadsAccount.threadsUserId}`, {
        params: {
          fields: 'id,username,threads_profile_picture_url,threads_biography',
          access_token: accessToken
        }
      })
      // Note: Threads API might not expose followers count publicly
      // This is a placeholder
      followersCount = 0
    } catch (error) {
      console.error('Failed to get profile:', error)
    }

    return NextResponse.json({
      connected: true,
      username: threadsAccount.username,
      summary: {
        totalPosts: media.length,
        totalViews,
        totalLikes,
        totalReplies,
        totalReposts,
        totalQuotes,
        totalEngagement: totalLikes + totalReplies + totalReposts + totalQuotes,
        followersCount
      },
      posts: postsWithInsights // Return all posts for calendar
    })
  } catch (error: any) {
    console.error('Threads insights error:', error.response?.data || error.message)
    return NextResponse.json(
      { 
        error: 'Failed to fetch insights',
        details: error.response?.data?.error?.message || error.message 
      },
      { status: 500 }
    )
  }
}
