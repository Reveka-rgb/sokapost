import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if post exists and belongs to user
    const post = await prisma.post.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Delete the post
    await prisma.post.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete post error:', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Check if post exists and belongs to user
    const post = await prisma.post.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Update the post
    const updatedPost = await prisma.post.update({
      where: { id: params.id },
      data: body
    })

    return NextResponse.json({ post: updatedPost })
  } catch (error: any) {
    console.error('Update post error:', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    )
  }
}
