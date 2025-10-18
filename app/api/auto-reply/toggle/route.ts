import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

// POST - Toggle auto-reply on/off
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { enabled } = await req.json()

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {
      enabled,
      updatedAt: new Date()
    }
    
    // 🎯 KEY: When turning ON, set checkpoint timestamp to NOW
    // This ensures we only reply to NEW comments after this point
    if (enabled) {
      updateData.enabledAt = new Date()
      console.log(`✅ Auto-reply enabled - checkpoint set at ${updateData.enabledAt.toISOString()}`)
      console.log(`📌 Will ONLY reply to comments posted AFTER this time`)
    }

    // Update or create settings with checkpoint
    const settings = await prisma.autoReplySettings.upsert({
      where: { 
        userId_platform: {
          userId: session.user.id,
          platform: 'threads'
        }
      },
      update: updateData,
      create: {
        userId: session.user.id,
        enabled,
        mode: 'ai',
        platform: 'threads',
        aiModel: 'gemini-2.0-flash-lite',
        aiDelay: 2,
        maxRepliesPerHour: 30,
        onlyFromFollowers: false,
        monitorAllPosts: true,
        enabledAt: enabled ? new Date() : null
      }
    })

    // 🚀 AUTO-TRIGGER: Langsung jalankan auto-reply saat enable
    if (enabled) {
      console.log('🚀 Auto-reply enabled - triggering first run immediately...')
      
      // Trigger async without blocking response
      // Use dynamic import to avoid circular dependency
      import('@/lib/services/auto-reply-scheduler').then(async (module) => {
        try {
          // Call the internal process function directly
          // This is safe because it's after the settings are saved
          console.log('⚡ Running initial auto-reply check...')
          
          // Trigger via API call to avoid direct dependency
          const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const triggerResponse = await fetch(`${origin}/api/auto-reply/trigger`, {
            method: 'POST',
            headers: {
              'Cookie': req.headers.get('cookie') || ''
            }
          })
          
          if (triggerResponse.ok) {
            console.log('✅ Initial auto-reply check completed')
          } else {
            console.log('⚠️ Initial auto-reply check failed (will retry on next cron)')
          }
        } catch (error) {
          console.error('❌ Initial auto-reply trigger failed:', error)
          // Don't fail the toggle - cron will pick it up
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: enabled 
        ? '✅ Auto-reply enabled! Processing comments now...' 
        : '⏸️ Auto-reply disabled',
      enabled: settings.enabled,
      enabledAt: settings.enabledAt
    })
  } catch (error: any) {
    console.error('Toggle auto-reply error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to toggle auto-reply' },
      { status: 500 }
    )
  }
}
