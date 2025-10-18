import { NextResponse } from 'next/server'

// Instagram Debug Token API - Disabled (messaging feature disabled)
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Feature Disabled',
      message: 'Instagram messaging debug is currently disabled.'
    }, 
    { status: 503 }
  )
}

// Original implementation - disabled
/*
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/utils/encryption'
import axios from 'axios'

export async function GET_DISABLED() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Instagram account
    const instagramAccount = await prisma.instagramAccount.findFirst({
      where: {
        userId: session.user.id
      }
    })

    if (!instagramAccount) {
      return NextResponse.json({ error: 'No Instagram account connected' }, { status: 404 })
    }

    // Decrypt token
    const accessToken = decryptToken(instagramAccount.accessToken)

    // Debug token with Facebook Graph API
    const debugResponse = await axios.get('https://graph.facebook.com/v18.0/debug_token', {
      params: {
        input_token: accessToken,
        access_token: accessToken
      }
    })

    // Get token permissions
    const permissionsResponse = await axios.get('https://graph.facebook.com/v18.0/me/permissions', {
      params: {
        access_token: accessToken
      }
    })

    // Get Instagram account info
    const igAccountResponse = await axios.get(`https://graph.facebook.com/v18.0/${instagramAccount.instagramId}`, {
      params: {
        fields: 'id,username,name,profile_picture_url',
        access_token: accessToken
      }
    })

    // Check if account can access conversations endpoint
    let conversationsTest = { success: false, error: null }
    try {
      await axios.get(`https://graph.facebook.com/v18.0/${instagramAccount.instagramId}/conversations`, {
        params: {
          access_token: accessToken,
          platform: 'instagram',
          fields: 'id'
        }
      })
      conversationsTest.success = true
    } catch (error: any) {
      conversationsTest.error = error.response?.data?.error?.message || error.message
    }

    return NextResponse.json({
      success: true,
      account: {
        instagramId: instagramAccount.instagramId,
        username: instagramAccount.username,
        facebookPageId: instagramAccount.facebookPageId,
        facebookPageName: instagramAccount.facebookPageName
      },
      tokenDebug: debugResponse.data.data,
      permissions: permissionsResponse.data.data,
      igAccountInfo: igAccountResponse.data,
      conversationsTest,
      recommendations: getRecommendations(
        debugResponse.data.data,
        permissionsResponse.data.data,
        conversationsTest
      )
    })
  } catch (error: any) {
    console.error('Debug token error:', error.response?.data || error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    }, { status: 500 })
  }
}

function getRecommendations(tokenDebug: any, permissions: any[], conversationsTest: any) {
  const recommendations = []

  // Check token validity
  if (!tokenDebug.is_valid) {
    recommendations.push({
      level: 'error',
      message: 'Token is invalid. Please reconnect your Instagram account.',
      action: 'Disconnect and reconnect Instagram in Settings'
    })
  }

  // Check token expiration
  if (tokenDebug.expires_at && tokenDebug.expires_at > 0) {
    const expiresIn = Math.floor((tokenDebug.expires_at * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
    if (expiresIn < 7) {
      recommendations.push({
        level: 'warning',
        message: `Token expires in ${expiresIn} days. Consider refreshing the token.`,
        action: 'Reconnect Instagram to get a new token'
      })
    }
  }

  // Check required permissions
  const requiredPermissions = [
    'pages_manage_metadata',
    'pages_read_engagement', 
    'instagram_manage_messages',
    'pages_show_list'
  ]

  const grantedPermissions = permissions
    .filter(p => p.status === 'granted')
    .map(p => p.permission)

  const missingPermissions = requiredPermissions.filter(
    p => !grantedPermissions.includes(p)
  )

  if (missingPermissions.length > 0) {
    recommendations.push({
      level: 'error',
      message: `Missing permissions: ${missingPermissions.join(', ')}`,
      action: 'Update app permissions in Facebook Developer Console and reconnect'
    })
  }

  // Check conversations API access
  if (!conversationsTest.success) {
    recommendations.push({
      level: 'error',
      message: `Cannot access conversations API: ${conversationsTest.error}`,
      action: 'Ensure you have Standard or Advanced Access for instagram_manage_messages'
    })
  }

  // Check token type
  if (tokenDebug.type !== 'PAGE') {
    recommendations.push({
      level: 'warning',
      message: 'Token type is not PAGE. Instagram Messaging requires Page Access Token.',
      action: 'Make sure you are using Page token, not User token'
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      level: 'success',
      message: 'All checks passed! Your Instagram account is properly configured.',
      action: 'You can start using Instagram Messaging'
    })
  }

  return recommendations
}
*/
