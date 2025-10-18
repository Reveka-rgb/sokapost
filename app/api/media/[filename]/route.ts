import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename
    const filepath = path.join(process.cwd(), 'public', 'uploads', filename)

    // Read file
    const fileBuffer = await readFile(filepath)

    // Determine content type based on extension
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentTypeMap: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp'
    }
    
    const contentType = contentTypeMap[ext || ''] || 'image/jpeg'

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(fileBuffer)

    // Return image with proper headers for Meta/Threads
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': fileBuffer.length.toString(),
        // Important for Meta/Facebook crawlers
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (error) {
    console.error('Error serving media:', error)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}

// Handle HEAD requests (Meta uses this to check if image exists)
export async function HEAD(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename
    const filepath = path.join(process.cwd(), 'public', 'uploads', filename)

    // Check if file exists
    await readFile(filepath)
    
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentTypeMap: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp'
    }
    
    const contentType = contentTypeMap[ext || ''] || 'image/jpeg'

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    return new NextResponse(null, { status: 404 })
  }
}
