import { NextResponse } from 'next/server'

// Instagram Messaging API - Coming Soon
// Requires App Review for Advanced Access to instagram_manage_messages
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Coming Soon',
      message: 'Instagram messaging feature requires App Review for Advanced Access. This feature is currently disabled.'
    }, 
    { status: 503 }
  )
}

// Original implementation - disabled for now
/*
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { getInstagramConversations } from '@/lib/api/instagram'
import { decryptToken } from '@/lib/utils/encryption'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const instagramAccount = await prisma.instagramAccount.findFirst({
      where: {
        userId: session.user.id
      }
    })

    if (!instagramAccount) {
      return NextResponse.json({ error: 'No Instagram account connected' }, { status: 404 })
    }

    const accessToken = decryptToken(instagramAccount.accessToken)

    const conversations = await getInstagramConversations(
      instagramAccount.instagramId,
      accessToken
    )

    return NextResponse.json({ conversations })
  } catch (error: any) {
    console.error('Get Instagram conversations error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
*/
