import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'

// GET - Check scheduler status
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if scheduler module is loaded
    const schedulerModule = await import('@/lib/services/auto-reply-scheduler')
    
    return NextResponse.json({
      success: true,
      scheduler: {
        loaded: true,
        interval: '5 minutes',
        status: 'The scheduler should be running in the background'
      },
      tip: 'Check server console logs for scheduler activity like: 🤖 [Auto-Reply] Starting job...'
    })

  } catch (error: any) {
    console.error('Scheduler status check error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check scheduler status' },
      { status: 500 }
    )
  }
}
