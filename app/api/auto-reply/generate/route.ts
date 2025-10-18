import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { generateAIReply } from '@/lib/auto-reply/ai-generator'
import { prisma } from '@/lib/prisma'

// POST - Generate AI reply for a message
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messageText, fromUsername } = await req.json()

    if (!messageText) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 })
    }

    // Get user's custom prompt if any (default platform: threads)
    const settings = await prisma.autoReplySettings.findUnique({
      where: { 
        userId_platform: {
          userId: session.user.id,
          platform: 'threads'
        }
      }
    })

    // Generate AI reply
    const replyText = await generateAIReply({
      messageText,
      fromUsername: fromUsername || 'User',
      customPrompt: settings?.customPrompt
    })

    return NextResponse.json({
      success: true,
      replyText
    })
  } catch (error: any) {
    console.error('Generate AI reply error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI reply' },
      { status: 500 }
    )
  }
}
