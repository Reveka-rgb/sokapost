import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/utils/encryption'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params
    const searchParams = req.nextUrl.searchParams
    const q = searchParams.get('q')
    const search_type = searchParams.get('search_type') || 'TOP'
    const search_mode = searchParams.get('search_mode') || 'KEYWORD'
    const media_type = searchParams.get('media_type') || ''
    const limit = searchParams.get('limit') || '25'

    if (!q) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    // Get user's Threads account
    const threadsAccount = await prisma.threadsAccount.findFirst({
      where: { userId: session.user.id }
    })

    if (!threadsAccount) {
      return NextResponse.json({ error: 'Threads account not connected' }, { status: 404 })
    }

    const accessToken = decryptToken(threadsAccount.accessToken)

    // Build API URL
    const apiUrl = new URL('https://graph.threads.net/v1.0/keyword_search')
    apiUrl.searchParams.append('q', q)
    apiUrl.searchParams.append('search_type', search_type)
    apiUrl.searchParams.append('search_mode', search_mode)
    if (media_type) {
      apiUrl.searchParams.append('media_type', media_type)
    }
    apiUrl.searchParams.append('limit', limit)
    apiUrl.searchParams.append('fields', 'id,text,media_type,media_url,permalink,timestamp,username,has_replies,is_quote_post,is_reply')
    apiUrl.searchParams.append('access_token', accessToken)

    // Call Threads API
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ error: error.error?.message || 'Failed to search' }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json({
      data: data.data || [],
      query: q,
      search_type,
      search_mode,
      media_type
    })

  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search' },
      { status: 500 }
    )
  }
}
