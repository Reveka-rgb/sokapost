import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { 
  exchangeCodeForFacebookToken,
  getFacebookPages,
  getInstagramAccount
} from '@/lib/api/instagram'
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
    // Step 1: Exchange code for Facebook token
    const fbToken = await exchangeCodeForFacebookToken(code)

    // Step 2: Get Facebook pages
    const pages = await getFacebookPages(fbToken.access_token)

    if (pages.length === 0) {
      throw new Error('No Facebook pages found')
    }

    // Step 3: Get Instagram account from first page
    const page = pages[0]
    const igAccount = await getInstagramAccount(page.id, page.access_token)

    if (!igAccount) {
      throw new Error('No Instagram Business account linked to this page')
    }

    // Step 4: Save to database
    await prisma.instagramAccount.upsert({
      where: { 
        userId_instagramId: {
          userId: session.user.id,
          instagramId: igAccount.id
        }
      },
      update: {
        username: igAccount.username,
        profilePictureUrl: igAccount.profile_picture_url,
        accessToken: encryptToken(page.access_token),
        facebookPageId: page.id,
        facebookPageName: page.name,
      },
      create: {
        userId: session.user.id,
        instagramId: igAccount.id,
        username: igAccount.username,
        profilePictureUrl: igAccount.profile_picture_url,
        accessToken: encryptToken(page.access_token),
        facebookPageId: page.id,
        facebookPageName: page.name,
      },
    })

    return NextResponse.redirect(`${baseUrl}/settings?success=instagram_connected`)
  } catch (error: any) {
    console.error('Instagram OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/settings?error=connection_failed`)
  }
}
