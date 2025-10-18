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
    const buffer = await readFile(filepath)
    const file = new Uint8Array(buffer)
    
    // Detect Content-Type from extension
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentTypeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    }
    
    const contentType = contentTypeMap[ext || ''] || 'application/octet-stream'
    
    // Return with proper headers
    return new NextResponse(file, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': file.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('File serve error:', error)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
