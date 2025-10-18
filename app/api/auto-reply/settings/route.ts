import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/auto-reply/default-prompt'

// GET - Get user's auto-reply settings
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create settings (default platform: threads)
    let settings = await prisma.autoReplySettings.findUnique({
      where: { 
        userId_platform: {
          userId: session.user.id,
          platform: 'threads'
        }
      }
    })

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.autoReplySettings.create({
        data: {
          userId: session.user.id,
          enabled: false,
          mode: 'ai',
          platform: 'threads',
          aiModel: 'gemini-2.0-flash-lite',
          aiDelay: 2,
          maxRepliesPerHour: 30,
          onlyFromFollowers: false,
          monitorAllPosts: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      settings,
      defaultPrompt: DEFAULT_SYSTEM_PROMPT
    })
  } catch (error: any) {
    console.error('Get auto-reply settings error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get settings' },
      { status: 500 }
    )
  }
}

// POST - Update auto-reply settings
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      enabled,
      mode,
      customPrompt,
      aiDelay,
      maxRepliesPerHour,
      onlyFromFollowers,
      excludeKeywords,
      monitorAllPosts,
      selectedPostIds
    } = body

    // Validate mode
    if (mode && !['ai', 'keyword', 'manual', 'off'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be: ai, keyword, manual, or off' },
        { status: 400 }
      )
    }

    // Update or create settings
    const settings = await prisma.autoReplySettings.upsert({
      where: { 
        userId_platform: {
          userId: session.user.id,
          platform: 'threads'
        }
      },
      update: {
        ...(typeof enabled === 'boolean' && { enabled }),
        ...(mode && { mode }),
        ...(customPrompt !== undefined && { customPrompt }),
        ...(aiDelay && { aiDelay: parseInt(aiDelay) }),
        ...(maxRepliesPerHour && { maxRepliesPerHour: parseInt(maxRepliesPerHour) }),
        ...(typeof onlyFromFollowers === 'boolean' && { onlyFromFollowers }),
        ...(excludeKeywords !== undefined && { 
          excludeKeywords: Array.isArray(excludeKeywords) 
            ? JSON.stringify(excludeKeywords)
            : excludeKeywords 
        }),
        ...(typeof monitorAllPosts === 'boolean' && { monitorAllPosts }),
        ...(selectedPostIds !== undefined && { 
          selectedPostIds: Array.isArray(selectedPostIds)
            ? JSON.stringify(selectedPostIds)
            : selectedPostIds
        }),
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        enabled: enabled ?? false,
        mode: mode ?? 'ai',
        platform: 'threads',
        aiModel: 'gemini-2.0-flash-lite',
        customPrompt,
        aiDelay: aiDelay ?? 2,
        maxRepliesPerHour: maxRepliesPerHour ?? 30,
        onlyFromFollowers: onlyFromFollowers ?? false,
        excludeKeywords: Array.isArray(excludeKeywords) 
          ? JSON.stringify(excludeKeywords)
          : excludeKeywords,
        monitorAllPosts: monitorAllPosts ?? true,
        selectedPostIds: Array.isArray(selectedPostIds)
          ? JSON.stringify(selectedPostIds)
          : selectedPostIds
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    })
  } catch (error: any) {
    console.error('Update auto-reply settings error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
}
