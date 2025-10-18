import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

// PUT - Update keyword
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const { keyword, replyText, enabled, priority } = await req.json()

    // Check if keyword exists and belongs to user
    const existing = await prisma.keywordReply.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Keyword not found' },
        { status: 404 }
      )
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update keyword
    const updated = await prisma.keywordReply.update({
      where: { id },
      data: {
        ...(keyword !== undefined && { keyword: keyword.trim().toLowerCase() }),
        ...(replyText !== undefined && { replyText: replyText.trim() }),
        ...(typeof enabled === 'boolean' && { enabled }),
        ...(priority !== undefined && { priority: parseInt(priority) }),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Keyword updated successfully',
      keyword: updated
    })
  } catch (error: any) {
    console.error('Update keyword error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update keyword' },
      { status: 500 }
    )
  }
}

// DELETE - Delete keyword
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Check if keyword exists and belongs to user
    const existing = await prisma.keywordReply.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Keyword not found' },
        { status: 404 }
      )
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete keyword
    await prisma.keywordReply.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Keyword deleted successfully'
    })
  } catch (error: any) {
    console.error('Delete keyword error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete keyword' },
      { status: 500 }
    )
  }
}
