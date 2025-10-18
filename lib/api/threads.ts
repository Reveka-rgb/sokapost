import axios from 'axios'

const THREADS_API_BASE = 'https://graph.threads.net/v1.0'
const THREADS_OAUTH_URL = 'https://threads.net/oauth/authorize'
const THREADS_TOKEN_URL = 'https://graph.threads.net/oauth/access_token'

export interface ThreadsTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface ThreadsLongLivedTokenResponse {
  access_token: string
  token_type: string
  expires_in: number // 60 days in seconds
}

export interface ThreadsUserProfile {
  id: string
  username: string
  threads_profile_picture_url?: string
}

// Generate OAuth URL
export function getThreadsAuthUrl(): string {
  const clientId = process.env.THREADS_CLIENT_ID
  const redirectUri = process.env.THREADS_REDIRECT_URI
  const scope = 'threads_basic,threads_content_publish,threads_manage_insights,threads_manage_replies,threads_read_replies'

  return `${THREADS_OAUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri!)}&scope=${scope}&response_type=code`
}

// Exchange code for short-lived token
export async function exchangeCodeForToken(code: string): Promise<ThreadsTokenResponse> {
  const params = {
    client_id: process.env.THREADS_CLIENT_ID!,
    client_secret: process.env.THREADS_CLIENT_SECRET!,
    redirect_uri: process.env.THREADS_REDIRECT_URI!,
    grant_type: 'authorization_code',
    code,
  }

  const response = await axios.post(THREADS_TOKEN_URL, null, { params })
  return response.data
}

// Exchange short-lived token for long-lived token (60 days)
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<ThreadsLongLivedTokenResponse> {
  const params = {
    client_secret: process.env.THREADS_CLIENT_SECRET!,
    grant_type: 'th_exchange_token',
    access_token: shortLivedToken,
  }

  const response = await axios.get(`${THREADS_API_BASE}/access_token`, { params })
  return response.data
}

// Refresh long-lived token
export async function refreshLongLivedToken(currentToken: string): Promise<ThreadsLongLivedTokenResponse> {
  const params = {
    client_secret: process.env.THREADS_CLIENT_SECRET!,
    grant_type: 'th_refresh_token',
    access_token: currentToken,
  }

  const response = await axios.get(`${THREADS_API_BASE}/refresh_access_token`, { params })
  return response.data
}

// Get user profile
export async function getThreadsProfile(accessToken: string): Promise<ThreadsUserProfile> {
  const response = await axios.get(`${THREADS_API_BASE}/me`, {
    params: {
      fields: 'id,username,threads_profile_picture_url',
      access_token: accessToken,
    },
  })
  return response.data
}

// Publish carousel (multiple images)
async function publishCarouselPost(params: {
  accessToken: string
  userId: string
  text: string
  mediaUrls: string[]
  topicTag?: string
}): Promise<string> {
  const { accessToken, userId, text, mediaUrls, topicTag } = params

  // Step 1: Create individual media containers for each image
  const mediaContainerIds: string[] = []
  
  for (const mediaUrl of mediaUrls) {
    const itemParams = {
      is_carousel_item: true,
      image_url: mediaUrl,
      access_token: accessToken,
      media_type: 'IMAGE'
    }

    const itemResponse = await axios.post(
      `${THREADS_API_BASE}/${userId}/threads`,
      null,
      { params: itemParams }
    )

    if (!itemResponse.data.id) {
      throw new Error('Failed to create carousel item container')
    }

    mediaContainerIds.push(itemResponse.data.id)
    console.log(`Created carousel item ${mediaContainerIds.length}/${mediaUrls.length}:`, itemResponse.data.id)
  }

  // Step 2: Create carousel container
  const carouselParams: any = {
    media_type: 'CAROUSEL',
    children: mediaContainerIds.join(','),
    text,
    access_token: accessToken,
  }

  // Add topic tag if provided
  if (topicTag && topicTag.trim()) {
    const cleanTopic = topicTag.trim()
      .replace(/[.&]/g, '')
      .substring(0, 50)
    if (cleanTopic.length > 0) {
      carouselParams.topic_tag = cleanTopic
    }
  }

  const carouselResponse = await axios.post(
    `${THREADS_API_BASE}/${userId}/threads`,
    null,
    { params: carouselParams }
  )

  const carouselId = carouselResponse.data.id
  if (!carouselId) {
    throw new Error('Failed to create carousel container')
  }

  console.log('Carousel container created:', carouselId)

  // Step 3: Wait and publish
  console.log('Waiting 30 seconds for carousel to process...')
  await new Promise(resolve => setTimeout(resolve, 30000))

  const publishResponse = await axios.post(
    `${THREADS_API_BASE}/${userId}/threads_publish`,
    null,
    {
      params: {
        creation_id: carouselId,
        access_token: accessToken,
      },
    }
  )

  if (!publishResponse.data.id) {
    throw new Error('Failed to publish carousel')
  }

  console.log('Carousel published:', publishResponse.data.id)
  return publishResponse.data.id
}

// Publish a post
export async function publishThreadsPost(params: {
  accessToken: string
  userId: string
  text: string
  mediaUrls?: string[]
  topicTag?: string
  linkAttachment?: string
}): Promise<string> {
  const { accessToken, userId, text, mediaUrls, topicTag, linkAttachment } = params

  // Convert relative URLs to absolute URLs using /api/media endpoint
  const fullMediaUrls = mediaUrls?.map(url => {
    if (url.startsWith('http')) {
      return url // Already absolute
    }
    
    // Convert /uploads/filename.jpg to /api/media/filename.jpg
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    // Extract filename from /uploads/filename.jpg
    const filename = url.split('/').pop()
    
    // Use /api/media endpoint for better headers and Meta compatibility
    return `${baseUrl}/api/media/${filename}`
  })

  // Determine media type and prepare container params
  const hasMedia = fullMediaUrls && fullMediaUrls.length > 0
  const isCarousel = hasMedia && fullMediaUrls.length > 1

  // If carousel (multiple images), we need 3-step process
  if (isCarousel) {
    return await publishCarouselPost({
      accessToken,
      userId,
      text,
      mediaUrls: fullMediaUrls!,
      topicTag
    })
  }

  // Single post: Create container
  const containerParams: any = {
    media_type: hasMedia ? 'IMAGE' : 'TEXT',
    text,
    access_token: accessToken,
  }

  // Add image if present
  if (hasMedia) {
    containerParams.image_url = fullMediaUrls![0]
  }

  // Add topic tag if provided (max 50 chars, no periods or ampersands)
  if (topicTag && topicTag.trim()) {
    const cleanTopic = topicTag.trim()
      .replace(/[.&]/g, '') // Remove periods and ampersands
      .substring(0, 50) // Max 50 characters
    if (cleanTopic.length > 0) {
      containerParams.topic_tag = cleanTopic
    }
  }

  // Add link attachment for TEXT posts only
  if (!hasMedia && linkAttachment && linkAttachment.trim()) {
    containerParams.link_attachment = linkAttachment.trim()
  }

  console.log('Creating Threads post container:', {
    media_type: containerParams.media_type,
    has_image: !!containerParams.image_url,
    image_url: containerParams.image_url,
    text_length: text.length,
    topic_tag: containerParams.topic_tag || 'none',
    link_attachment: containerParams.link_attachment || 'none'
  })

  console.log('Full container params:', JSON.stringify(containerParams, null, 2))

  try {
    const containerResponse = await axios.post(
      `${THREADS_API_BASE}/${userId}/threads`,
      null,
      { params: containerParams }
    )

    console.log('Container response:', containerResponse.data)
    const containerId = containerResponse.data.id
    
    if (!containerId) {
      throw new Error('No container ID received from Threads API')
    }

    console.log('Container created:', containerId)

    // Wait 30 seconds for container to be fully processed (recommended by Threads API)
    console.log('Waiting 30 seconds for container to process...')
    await new Promise(resolve => setTimeout(resolve, 30000))

    // Publish container
    const publishResponse = await axios.post(
      `${THREADS_API_BASE}/${userId}/threads_publish`,
      null,
      {
        params: {
          creation_id: containerId,
          access_token: accessToken,
        },
      }
    )

    console.log('Publish response:', publishResponse.data)
    
    if (!publishResponse.data.id) {
      throw new Error('No post ID received after publishing')
    }

    console.log('✅ Post published successfully:', publishResponse.data.id)
    return publishResponse.data.id
  } catch (error: any) {
    console.error('❌ Threads API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        params: error.config?.params
      }
    })
    throw error
  }
}

// ==================== REPLY MANAGEMENT ====================

export interface ThreadsReply {
  id: string
  text: string
  username: string
  timestamp: string
  permalink?: string
  has_replies: boolean
  is_reply: boolean
  hide_status?: string
  replied_to?: {
    id: string
  }
  root_post?: {
    id: string
  }
}

export interface ThreadsConversationResponse {
  data: ThreadsReply[]
  paging?: {
    cursors: {
      before: string
      after: string
    }
  }
}

// Fetch replies from a post (conversation format - all nested replies)
export async function fetchThreadsConversation(params: {
  accessToken: string
  mediaId: string
  reverse?: boolean
}): Promise<ThreadsConversationResponse> {
  const { accessToken, mediaId, reverse = true } = params

  try {
    const response = await axios.get(`${THREADS_API_BASE}/${mediaId}/conversation`, {
      params: {
        fields: 'id,text,username,timestamp,permalink,has_replies,is_reply,hide_status,replied_to,root_post',
        reverse,
        access_token: accessToken,
      },
    })

    return response.data
  } catch (error: any) {
    console.error('Fetch conversation error:', error.response?.data || error.message)
    throw error
  }
}

// Fetch top-level replies only
export async function fetchThreadsReplies(params: {
  accessToken: string
  mediaId: string
  reverse?: boolean
}): Promise<ThreadsConversationResponse> {
  const { accessToken, mediaId, reverse = true } = params

  try {
    const response = await axios.get(`${THREADS_API_BASE}/${mediaId}/replies`, {
      params: {
        fields: 'id,text,username,timestamp,permalink,has_replies,is_reply,hide_status,replied_to,root_post',
        reverse,
        access_token: accessToken,
      },
    })

    return response.data
  } catch (error: any) {
    console.error('Fetch replies error:', error.response?.data || error.message)
    throw error
  }
}

// Send a reply to a post/reply
export async function sendThreadsReply(params: {
  accessToken: string
  userId: string
  replyToId: string
  text: string
  mediaUrl?: string
}): Promise<string> {
  const { accessToken, userId, replyToId, text, mediaUrl } = params

  try {
    // Step 1: Create reply container
    const containerParams: any = {
      media_type: mediaUrl ? 'IMAGE' : 'TEXT',
      text,
      reply_to_id: replyToId,
      access_token: accessToken,
    }

    if (mediaUrl) {
      // Convert to absolute URL if needed
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const filename = mediaUrl.split('/').pop()
      containerParams.image_url = mediaUrl.startsWith('http') 
        ? mediaUrl 
        : `${baseUrl}/api/media/${filename}`
    }

    console.log('Creating reply container:', containerParams)

    const containerResponse = await axios.post(
      `${THREADS_API_BASE}/${userId}/threads`,
      null,
      { params: containerParams }
    )

    const containerId = containerResponse.data.id
    if (!containerId) {
      throw new Error('No container ID received')
    }

    console.log('Reply container created:', containerId)

    // Step 2: Wait for processing (30 seconds recommended)
    console.log('Waiting 30 seconds for reply to process...')
    await new Promise(resolve => setTimeout(resolve, 30000))

    // Step 3: Publish reply
    const publishResponse = await axios.post(
      `${THREADS_API_BASE}/${userId}/threads_publish`,
      null,
      {
        params: {
          creation_id: containerId,
          access_token: accessToken,
        },
      }
    )

    const replyId = publishResponse.data.id
    if (!replyId) {
      throw new Error('No reply ID received after publishing')
    }

    console.log('✅ Reply published successfully:', replyId)
    return replyId
  } catch (error: any) {
    console.error('❌ Send reply error:', {
      message: error.message,
      response: error.response?.data,
    })
    throw error
  }
}

// Hide/unhide a reply
export async function manageThreadsReply(params: {
  accessToken: string
  replyId: string
  hide: boolean
}): Promise<boolean> {
  const { accessToken, replyId, hide } = params

  try {
    const response = await axios.post(
      `${THREADS_API_BASE}/${replyId}/manage_reply`,
      null,
      {
        params: {
          hide,
          access_token: accessToken,
        },
      }
    )

    return response.data.success === true
  } catch (error: any) {
    console.error('Manage reply error:', error.response?.data || error.message)
    throw error
  }
}

// Get user's published posts (for monitoring)
export async function getUserThreadsPosts(params: {
  accessToken: string
  userId: string
  limit?: number
}): Promise<ThreadsConversationResponse> {
  const { accessToken, userId, limit = 25 } = params

  try {
    const response = await axios.get(`${THREADS_API_BASE}/${userId}/threads`, {
      params: {
        fields: 'id,text,timestamp,permalink,media_type,media_url,has_replies',
        limit,
        access_token: accessToken,
      },
    })

    return response.data
  } catch (error: any) {
    console.error('Get user posts error:', error.response?.data || error.message)
    throw error
  }
}
