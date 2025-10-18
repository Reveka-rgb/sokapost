import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

// GET - Get all keywords for user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const keywords = await prisma.keywordReply.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { enabled: 'desc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      keywords
    })
  } catch (error: any) {
    console.error('Get keywords error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get keywords' },
      { status: 500 }
    )
  }
}

// POST - Create new keyword
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { keyword, replyText, enabled, priority } = await req.json()

    // Validation
    if (!keyword || !keyword.trim()) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      )
    }

    if (!replyText || !replyText.trim()) {
      return NextResponse.json(
        { error: 'Reply text is required' },
        { status: 400 }
      )
    }

    // Create keyword
    const keywordReply = await prisma.keywordReply.create({
      data: {
        userId: session.user.id,
        keyword: keyword.trim().toLowerCase(), // Store as lowercase for case-insensitive matching
        replyText: replyText.trim(),
        enabled: enabled ?? true,
        priority: priority ?? 0
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Keyword created successfully',
      keyword: keywordReply
    })
  } catch (error: any) {
    console.error('Create keyword error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create keyword' },
      { status: 500 }
    )
  }
}
