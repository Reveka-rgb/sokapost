import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

// GET - Debug settings to see exact database values
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.autoReplySettings.findUnique({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: 'threads'
        }
      }
    })

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
    }

    // Try to parse selectedPostIds
    let parsedPostIds = null
    let parseError = null
    
    if (settings.selectedPostIds) {
      try {
        parsedPostIds = JSON.parse(settings.selectedPostIds)
      } catch (e: any) {
        parseError = e.message
      }
    }

    return NextResponse.json({
      debug: {
        raw: {
          selectedPostIds: settings.selectedPostIds,
          type: typeof settings.selectedPostIds,
          length: settings.selectedPostIds?.length,
          monitorAllPosts: settings.monitorAllPosts
        },
        parsed: {
          value: parsedPostIds,
          isArray: Array.isArray(parsedPostIds),
          arrayLength: Array.isArray(parsedPostIds) ? parsedPostIds.length : 0,
          parseError
        },
        diagnosis: {
          hasSelectedPostIds: !!settings.selectedPostIds,
          willMonitor: settings.monitorAllPosts 
            ? 'ALL POSTS' 
            : (parsedPostIds && Array.isArray(parsedPostIds) && parsedPostIds.length > 0)
              ? `${parsedPostIds.length} selected posts`
              : '⚠️ NO POSTS (will skip monitoring)',
          recommendation: !settings.monitorAllPosts && (!parsedPostIds || parsedPostIds.length === 0)
            ? '⚠️ Issue: monitorAllPosts=false but no posts selected. Either enable monitorAllPosts or select posts.'
            : '✅ Configuration OK'
        }
      }
    })
  } catch (error: any) {
    console.error('Debug settings error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
