import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

// GET - Fetch reply history with pagination and filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') // filter by status
    const mode = searchParams.get('mode') // filter by mode

    const skip = (page - 1) * limit

    // Build filter
    const where: any = {
      userId: session.user.id
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (mode && mode !== 'all') {
      where.replyMode = mode
    }

    // Get total count
    const total = await prisma.replyHistory.count({ where })

    // Get paginated history
    const history = await prisma.replyHistory.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    return NextResponse.json({
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Fetch history error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch history' },
      { status: 500 }
    )
  }
}
