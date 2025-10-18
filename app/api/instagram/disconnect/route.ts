import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete all Instagram accounts for this user
    await prisma.instagramAccount.deleteMany({
      where: {
        userId: session.user.id
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Instagram account disconnected' 
    })
  } catch (error) {
    console.error('Instagram disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Instagram account' },
      { status: 500 }
    )
  }
}
