import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

// GET - Debug auto-reply settings
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with all related data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        autoReplySettings: true,
        threadsAccounts: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const threadsSettings = user.autoReplySettings.find(s => s.platform === 'threads')
    const threadsAccount = user.threadsAccounts[0]

    // Parse selectedPostIds
    let parsedPostIds = null
    if (threadsSettings?.selectedPostIds) {
      try {
        parsedPostIds = JSON.parse(threadsSettings.selectedPostIds)
      } catch (e) {
        parsedPostIds = 'PARSE_ERROR'
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        userId: user.id,
        hasThreadsAccount: !!threadsAccount,
        threadsUsername: threadsAccount?.username || null,
        autoReplySettings: threadsSettings ? {
          enabled: threadsSettings.enabled,
          mode: threadsSettings.mode,
          monitorAllPosts: threadsSettings.monitorAllPosts,
          selectedPostIds: threadsSettings.selectedPostIds,
          parsedPostIds: parsedPostIds,
          parsedPostIdsCount: Array.isArray(parsedPostIds) ? parsedPostIds.length : 0,
          maxRepliesPerHour: threadsSettings.maxRepliesPerHour,
          aiDelay: threadsSettings.aiDelay
        } : null,
        diagnosis: {
          willMonitor: threadsSettings?.enabled ? (
            threadsSettings.monitorAllPosts 
              ? 'YES - Will monitor ALL posts' 
              : (Array.isArray(parsedPostIds) && parsedPostIds.length > 0)
                ? `YES - Will monitor ${parsedPostIds.length} selected posts`
                : '❌ NO - No posts selected!'
          ) : '❌ NO - Auto-reply disabled',
          recommendation: !threadsSettings?.enabled 
            ? 'Enable auto-reply in settings'
            : !threadsSettings.monitorAllPosts && (!parsedPostIds || parsedPostIds.length === 0)
              ? '⚠️ ISSUE FOUND: You need to either enable "Monitor All Posts" OR select specific posts to monitor'
              : '✅ Configuration looks good'
        }
      }
    })

  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to debug settings' },
      { status: 500 }
    )
  }
}
