import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { 
  exchangeCodeForToken, 
  exchangeForLongLivedToken,
  getThreadsProfile 
} from '@/lib/api/threads'
import { prisma } from '@/lib/prisma'
import { encryptToken } from '@/lib/utils/encryption'

export async function GET(request: Request) {
  const session = await getServerSession()

  // Get base URL from env or request headers (for Cloudflare Tunnel support)
  const baseUrl = process.env.NEXTAUTH_URL || 
                  process.env.NEXT_PUBLIC_APP_URL || 
                  `https://${request.headers.get('host')}`

  if (!session?.user) {
    return NextResponse.redirect(`${baseUrl}/login`)
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/settings?error=${error || 'no_code'}`)
  }

  try {
    // Step 1: Exchange code for short-lived token
    const shortToken = await exchangeCodeForToken(code)

    // Step 2: Exchange for long-lived token (60 days)
    const longToken = await exchangeForLongLivedToken(shortToken.access_token)

    // Step 3: Get user profile
    const profile = await getThreadsProfile(longToken.access_token)

    // Step 4: Save to database
    await prisma.threadsAccount.upsert({
      where: { userId: session.user.id },
      update: {
        threadsUserId: profile.id,
        username: profile.username,
        profilePictureUrl: profile.threads_profile_picture_url,
        accessToken: encryptToken(longToken.access_token),
        expiresAt: new Date(Date.now() + longToken.expires_in * 1000),
      },
      create: {
        userId: session.user.id,
        threadsUserId: profile.id,
        username: profile.username,
        profilePictureUrl: profile.threads_profile_picture_url,
        accessToken: encryptToken(longToken.access_token),
        expiresAt: new Date(Date.now() + longToken.expires_in * 1000),
      },
    })

    return NextResponse.redirect(`${baseUrl}/settings?success=threads_connected`)
  } catch (error: any) {
    console.error('Threads OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/settings?error=connection_failed`)
  }
}
