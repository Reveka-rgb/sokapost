import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/utils/encryption'
import axios from 'axios'

const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v18.0'

export async function POST() {
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

    // Decrypt the access token
    const accessToken = decryptToken(instagramAccount.accessToken)

    try {
      // Fetch updated profile information from Instagram Graph API
      const response = await axios.get(`${FACEBOOK_GRAPH_URL}/${instagramAccount.instagramId}`, {
        params: {
          fields: 'id,username,profile_picture_url',
          access_token: accessToken,
        },
      })

      console.log('Refreshed Instagram profile data:', JSON.stringify(response.data, null, 2))

      // Update the database with the new profile picture URL
      const updatedAccount = await prisma.instagramAccount.update({
        where: {
          id: instagramAccount.id
        },
        data: {
          username: response.data.username || instagramAccount.username,
          profilePictureUrl: response.data.profile_picture_url || instagramAccount.profilePictureUrl,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        profile_picture_url: updatedAccount.profilePictureUrl,
        username: updatedAccount.username
      })
    } catch (apiError: any) {
      console.error('Instagram Graph API error:', apiError.response?.data || apiError.message)
      return NextResponse.json(
        { 
          error: 'Failed to fetch profile from Instagram',
          details: apiError.response?.data?.error?.message || apiError.message 
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Refresh Instagram profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
