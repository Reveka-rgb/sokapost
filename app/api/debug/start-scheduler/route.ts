import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { startPostScheduler, getSchedulerStatus } from '@/lib/services/scheduler'

export async function POST() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Manually starting scheduler...')
    
    const beforeStatus = getSchedulerStatus()
    console.log('Before:', beforeStatus)
    
    startPostScheduler()
    
    const afterStatus = getSchedulerStatus()
    console.log('After:', afterStatus)

    return NextResponse.json({
      message: 'Scheduler start attempted',
      before: beforeStatus,
      after: afterStatus,
      success: afterStatus.running
    })
  } catch (error) {
    console.error('Start scheduler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
