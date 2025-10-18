import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/utils/encryption'
import { sendThreadsReply } from '@/lib/api/threads'

// POST - Send reply to a Threads comment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { commentId, replyText } = await req.json()

    if (!commentId || !replyText || !replyText.trim()) {
      return NextResponse.json({ error: 'Comment ID and reply text are required' }, { status: 400 })
    }

    // Get threads account
    const threadsAccount = await prisma.threadsAccount.findFirst({
      where: { userId: session.user.id }
    })

    if (!threadsAccount) {
      return NextResponse.json({ error: 'Threads account not connected' }, { status: 400 })
    }

    // Decrypt token
    const accessToken = decryptToken(threadsAccount.accessToken)

    // Send reply
    const ourReplyId = await sendThreadsReply({
      accessToken,
      userId: threadsAccount.threadsUserId,
      replyToId: commentId,
      text: replyText.trim()
    })

    return NextResponse.json({
      success: true,
      replyId: ourReplyId
    })
  } catch (error: any) {
    console.error('Send Threads reply error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send reply' },
      { status: 500 }
    )
  }
}
