import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { readdir, unlink } from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all posts with media from this user
    const postsWithMedia = await prisma.post.findMany({
      where: {
        userId: session.user.id,
        mediaUrls: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Extract all unique image URLs
    const mediaSet = new Set<string>()
    const mediaDetails: Array<{
      url: string
      filename: string
      usedInPosts: number
      firstUsedAt: Date
    }> = []

    const urlToPostCount = new Map<string, { count: number; firstDate: Date }>()

    postsWithMedia.forEach(post => {
      try {
        const urls = JSON.parse(post.mediaUrls || '[]')
        urls.forEach((url: string) => {
          mediaSet.add(url)
          
          if (!urlToPostCount.has(url)) {
            urlToPostCount.set(url, { count: 1, firstDate: post.createdAt })
          } else {
            const existing = urlToPostCount.get(url)!
            urlToPostCount.set(url, { 
              count: existing.count + 1, 
              firstDate: existing.firstDate < post.createdAt ? existing.firstDate : post.createdAt 
            })
          }
        })
      } catch (error) {
        console.error('Error parsing mediaUrls:', error)
      }
    })

    // Build media details array
    mediaSet.forEach(url => {
      const filename = url.split('/').pop() || url
      const stats = urlToPostCount.get(url)!
      
      mediaDetails.push({
        url,
        filename,
        usedInPosts: stats.count,
        firstUsedAt: stats.firstDate
      })
    })

    // Sort by most recently used
    mediaDetails.sort((a, b) => b.firstUsedAt.getTime() - a.firstUsedAt.getTime())

    return NextResponse.json({ 
      media: mediaDetails,
      total: mediaDetails.length
    })
  } catch (error) {
    console.error('Get media library error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { urls } = await request.json()
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 })
    }

    const deletedFiles: string[] = []
    const errors: string[] = []

    for (const url of urls) {
      try {
        // Check if media is used in any posts
        const postsUsingMedia = await prisma.post.findMany({
          where: {
            userId: session.user.id,
            mediaUrls: {
              contains: url
            }
          }
        })

        if (postsUsingMedia.length > 0) {
          errors.push(`${url}: Used in ${postsUsingMedia.length} post(s)`)
          continue
        }

        // Delete file from filesystem
        if (url.startsWith('/uploads/')) {
          const filename = url.split('/').pop()
          if (filename) {
            const filePath = path.join(process.cwd(), 'public', 'uploads', filename)
            try {
              await unlink(filePath)
              deletedFiles.push(url)
            } catch (fileError: any) {
              if (fileError.code === 'ENOENT') {
                errors.push(`${url}: File not found`)
              } else {
                errors.push(`${url}: ${fileError.message}`)
              }
            }
          }
        } else {
          errors.push(`${url}: External URL cannot be deleted`)
        }
      } catch (error: any) {
        errors.push(`${url}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deletedFiles,
      deletedCount: deletedFiles.length,
      errors: errors,
      errorCount: errors.length
    })
  } catch (error) {
    console.error('Delete media error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
