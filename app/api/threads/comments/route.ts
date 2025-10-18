import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/utils/encryption'
import axios from 'axios'

// GET - Fetch all comments from user's Threads posts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const postId = searchParams.get('postId') // Optional: filter by specific post

    // Get threads account
    const threadsAccount = await prisma.threadsAccount.findFirst({
      where: { userId: session.user.id }
    })

    if (!threadsAccount) {
      return NextResponse.json({ error: 'Threads account not connected' }, { status: 404 })
    }

    const accessToken = decryptToken(threadsAccount.accessToken)

    // First, fetch ALL user's replies to get list of comment IDs we've replied to
    let repliedToIds = new Set<string>()
    try {
      const repliesResponse = await axios.get(
        `https://graph.threads.net/v1.0/${threadsAccount.threadsUserId}/replies`,
        {
          params: {
            fields: 'id,replied_to',
            limit: 100, // Fetch up to 100 recent replies
            access_token: accessToken
          }
        }
      )
      
      const replies = repliesResponse.data.data || []
      // Extract all comment IDs we replied to
      repliedToIds = new Set(
        replies
          .filter((r: any) => r.replied_to?.id)
          .map((r: any) => r.replied_to.id)
      )
      
      console.log(`[INFO] Fetched ${replies.length} user replies, replied to ${repliedToIds.size} comments`)
    } catch (err: any) {
      console.error('Failed to fetch user replies:', err.response?.data || err.message)
      // Continue without replied status if this fails
    }

    let allComments: any[] = []

    if (postId) {
      // Fetch comments for specific post
      const comments = await fetchPostComments(postId, accessToken, threadsAccount.username, repliedToIds)
      allComments = comments
    } else {
      // Fetch user's recent posts
      const postsResponse = await axios.get(
        `https://graph.threads.net/v1.0/${threadsAccount.threadsUserId}/threads`,
        {
          params: {
            fields: 'id,text,timestamp,permalink,media_type,media_url',
            limit: 25,
            access_token: accessToken
          }
        }
      )

      const posts = postsResponse.data.data || []

      // Fetch comments for each post
      for (const post of posts) {
        try {
          const comments = await fetchPostComments(post.id, accessToken, threadsAccount.username, repliedToIds)
          
          // Add post info to each comment
          const commentsWithPost = comments.map((c: any) => ({
            ...c,
            postId: post.id,
            postText: post.text,
            postPermalink: post.permalink,
            postMediaType: post.media_type,
            postMediaUrl: post.media_url
          }))
          
          allComments = [...allComments, ...commentsWithPost]
        } catch (err) {
          console.error(`Failed to fetch comments for post ${post.id}:`, err)
        }
      }
    }

    // Sort by timestamp (newest first)
    allComments.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    return NextResponse.json({
      comments: allComments,
      total: allComments.length
    })
  } catch (error: any) {
    console.error('Fetch Threads comments error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

async function fetchPostComments(
  postId: string,
  accessToken: string,
  myUsername: string,
  repliedToIds: Set<string>
): Promise<any[]> {
  try {
    const response = await axios.get(
      `https://graph.threads.net/v1.0/${postId}/conversation`,
      {
        params: {
          fields: 'id,text,username,timestamp,permalink,has_replies,is_reply',
          reverse: false, // Oldest first
          access_token: accessToken
        }
      }
    )

    const conversation = response.data.data || []
    
    // Filter out own replies, keep only others' comments
    const othersComments = conversation.filter((c: any) => c.username !== myUsername)
    
    // Mark comments we've already replied to using the repliedToIds Set
    const commentsWithReplyStatus = othersComments.map((comment: any) => ({
      ...comment,
      hasReplied: repliedToIds.has(comment.id)
    }))
    
    return commentsWithReplyStatus
  } catch (error) {
    console.error('Fetch post comments error:', error)
    return []
  }
}
