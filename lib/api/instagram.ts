import axios from 'axios'

const FACEBOOK_OAUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth'
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token'
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v18.0'

export function getInstagramAuthUrl(): string {
  const appId = process.env.FACEBOOK_APP_ID
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI
  const scope = 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,instagram_manage_messages,instagram_manage_insights'

  return `${FACEBOOK_OAUTH_URL}?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri!)}&scope=${scope}&response_type=code`
}

export async function exchangeCodeForFacebookToken(code: string): Promise<{ access_token: string }> {
  const params = {
    client_id: process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
    code,
  }

  const response = await axios.get(FACEBOOK_TOKEN_URL, { params })
  return response.data
}

export async function getFacebookPages(accessToken: string): Promise<any[]> {
  const response = await axios.get(`${FACEBOOK_GRAPH_URL}/me/accounts`, {
    params: {
      access_token: accessToken,
      fields: 'id,name,access_token',
    },
  })
  return response.data.data || []
}

export async function getInstagramAccount(pageId: string, pageAccessToken: string): Promise<any> {
  try {
    const response = await axios.get(`${FACEBOOK_GRAPH_URL}/${pageId}`, {
      params: {
        fields: 'instagram_business_account{id,username,profile_picture_url}',
        access_token: pageAccessToken,
      },
    })
    
    const igAccount = response.data.instagram_business_account
    
    // Log the response for debugging
    console.log('Instagram account data from Graph API:', JSON.stringify(igAccount, null, 2))
    
    // If profile_picture_url is not available, try to get it from the IG account directly
    if (igAccount && !igAccount.profile_picture_url) {
      console.log('Profile picture URL not in initial response, fetching from IG account...')
      try {
        const profileResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/${igAccount.id}`, {
          params: {
            fields: 'id,username,profile_picture_url',
            access_token: pageAccessToken,
          },
        })
        console.log('Profile data from IG account:', JSON.stringify(profileResponse.data, null, 2))
        
        if (profileResponse.data.profile_picture_url) {
          igAccount.profile_picture_url = profileResponse.data.profile_picture_url
        }
      } catch (profileError) {
        console.error('Failed to fetch profile picture from IG account:', profileError)
      }
    }
    
    return igAccount
  } catch (error: any) {
    console.error('Error fetching Instagram account:', error.response?.data || error.message)
    throw error
  }
}

// ==================== INSTAGRAM POSTING ====================

/**
 * Publish Instagram post (single image or text-only)
 */
export async function publishInstagramPost(
  instagramAccountId: string,
  accessToken: string,
  content: {
    caption?: string
    imageUrl?: string
  }
): Promise<{ id: string }> {
  try {
    // Step 1: Create container
    const containerParams: any = {
      access_token: accessToken
    }

    if (content.caption) {
      containerParams.caption = content.caption
    }

    if (content.imageUrl) {
      containerParams.image_url = content.imageUrl
    }

    const containerResponse = await axios.post(
      `${FACEBOOK_GRAPH_URL}/${instagramAccountId}/media`,
      null,
      { params: containerParams }
    )

    const creationId = containerResponse.data.id

    // Step 2: Publish container
    const publishResponse = await axios.post(
      `${FACEBOOK_GRAPH_URL}/${instagramAccountId}/media_publish`,
      null,
      {
        params: {
          creation_id: creationId,
          access_token: accessToken
        }
      }
    )

    return { id: publishResponse.data.id }
  } catch (error: any) {
    console.error('Instagram publish error:', error.response?.data || error.message)
    throw new Error(error.response?.data?.error?.message || 'Failed to publish to Instagram')
  }
}

/**
 * Publish Instagram carousel (multiple images)
 */
export async function publishInstagramCarousel(
  instagramAccountId: string,
  accessToken: string,
  content: {
    caption?: string
    imageUrls: string[]
  }
): Promise<{ id: string }> {
  try {
    if (!content.imageUrls || content.imageUrls.length === 0) {
      throw new Error('At least one image is required for carousel')
    }

    if (content.imageUrls.length > 10) {
      throw new Error('Maximum 10 images allowed for carousel')
    }

    // Step 1: Create container for each image
    const childrenIds: string[] = []
    
    for (const imageUrl of content.imageUrls) {
      const childResponse = await axios.post(
        `${FACEBOOK_GRAPH_URL}/${instagramAccountId}/media`,
        null,
        {
          params: {
            image_url: imageUrl,
            is_carousel_item: true,
            access_token: accessToken
          }
        }
      )
      childrenIds.push(childResponse.data.id)
    }

    // Step 2: Create carousel container
    const carouselParams: any = {
      media_type: 'CAROUSEL',
      children: childrenIds.join(','),
      access_token: accessToken
    }

    if (content.caption) {
      carouselParams.caption = content.caption
    }

    const carouselResponse = await axios.post(
      `${FACEBOOK_GRAPH_URL}/${instagramAccountId}/media`,
      null,
      { params: carouselParams }
    )

    const creationId = carouselResponse.data.id

    // Step 3: Publish carousel
    const publishResponse = await axios.post(
      `${FACEBOOK_GRAPH_URL}/${instagramAccountId}/media_publish`,
      null,
      {
        params: {
          creation_id: creationId,
          access_token: accessToken
        }
      }
    )

    return { id: publishResponse.data.id }
  } catch (error: any) {
    console.error('Instagram carousel publish error:', error.response?.data || error.message)
    throw new Error(error.response?.data?.error?.message || 'Failed to publish carousel to Instagram')
  }
}

// ==================== INSTAGRAM MESSAGING ====================

/**
 * Get Instagram conversations/inbox
 */
export async function getInstagramConversations(
  instagramAccountId: string,
  accessToken: string
): Promise<any[]> {
  try {
    const response = await axios.get(
      `${FACEBOOK_GRAPH_URL}/${instagramAccountId}/conversations`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,participants,updated_time,message_count',
          platform: 'instagram'
        }
      }
    )

    const conversations = response.data.data || []

    // Enhance each conversation with participant details
    const enhancedConversations = await Promise.all(
      conversations.map(async (conv: any) => {
        try {
          // Get participant usernames
          const participantDetails = await Promise.all(
            conv.participants.data.map(async (participant: any) => {
              try {
                const userResponse = await axios.get(
                  `${FACEBOOK_GRAPH_URL}/${participant.id}`,
                  {
                    params: {
                      access_token: accessToken,
                      fields: 'username,profile_pic'
                    }
                  }
                )
                return userResponse.data
              } catch (err) {
                console.error('Error fetching participant details:', err)
                return { id: participant.id, username: 'Unknown' }
              }
            })
          )

          return {
            ...conv,
            participants: participantDetails
          }
        } catch (err) {
          return conv
        }
      })
    )

    return enhancedConversations
  } catch (error: any) {
    console.error('Error fetching Instagram conversations:', error.response?.data || error.message)
    throw new Error(error.response?.data?.error?.message || 'Failed to fetch conversations')
  }
}

/**
 * Get messages from a specific conversation
 */
export async function getInstagramMessages(
  conversationId: string,
  accessToken: string
): Promise<any[]> {
  try {
    const response = await axios.get(
      `${FACEBOOK_GRAPH_URL}/${conversationId}/messages`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,created_time,from,message,attachments'
        }
      }
    )

    return response.data.data || []
  } catch (error: any) {
    console.error('Error fetching Instagram messages:', error.response?.data || error.message)
    throw new Error(error.response?.data?.error?.message || 'Failed to fetch messages')
  }
}

/**
 * Send Instagram direct message
 */
export async function sendInstagramMessage(
  instagramAccountId: string,
  recipientId: string,
  message: string,
  accessToken: string
): Promise<{ id: string }> {
  try {
    const response = await axios.post(
      `${FACEBOOK_GRAPH_URL}/${instagramAccountId}/messages`,
      {
        recipient: {
          id: recipientId
        },
        message: {
          text: message
        }
      },
      {
        params: {
          access_token: accessToken
        }
      }
    )

    return { id: response.data.message_id }
  } catch (error: any) {
    console.error('Error sending Instagram message:', error.response?.data || error.message)
    throw new Error(error.response?.data?.error?.message || 'Failed to send message')
  }
}
