import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/utils/encryption'
import { sendThreadsReply } from '@/lib/api/threads'

// POST - Send reply to a history item
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { replyText } = await req.json()

    if (!replyText || !replyText.trim()) {
      return NextResponse.json({ error: 'Reply text is required' }, { status: 400 })
    }

    // Get history item
    const historyItem = await prisma.replyHistory.findUnique({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!historyItem) {
      return NextResponse.json({ error: 'History item not found' }, { status: 404 })
    }

    // Check if already replied
    if (historyItem.status === 'replied') {
      return NextResponse.json({ error: 'Already replied to this message' }, { status: 400 })
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
      replyToId: historyItem.replyId,
      text: replyText.trim()
    })

    // Update history
    const updated = await prisma.replyHistory.update({
      where: { id: params.id },
      data: {
        ourReplyId,
        ourReplyText: replyText.trim(),
        status: 'replied',
        replyMode: 'manual',
        repliedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      historyItem: updated
    })
  } catch (error: any) {
    console.error('Send reply error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send reply' },
      { status: 500 }
    )
  }
}
