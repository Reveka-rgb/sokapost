import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getServerSession } from '@/lib/auth-api'
import { withRateLimit } from '@/lib/security/rate-limit'
import { handleApiError, createApiError } from '@/lib/security/error-handler'
import { validateFile, sanitizeFilename } from '@/lib/security/validation-schemas'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      throw createApiError('UNAUTHORIZED')
    }

    // Apply rate limiting (30 uploads per hour)
    const rateLimitResult = await withRateLimit(request, 'upload', session.user.id)
    if ('status' in rateLimitResult) {
      return rateLimitResult
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      throw createApiError('BAD_REQUEST')
    }

    // Validate file type and size
    const validation = validateFile(file, 'image')
    if (!validation.valid) {
      throw createApiError('VALIDATION_ERROR', { message: validation.error })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique and safe filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop() || 'jpg'
    const sanitizedName = sanitizeFilename(`${timestamp}-${randomString}.${extension}`)
    
    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filepath = path.join(uploadsDir, sanitizedName)
    
    await writeFile(filepath, buffer)
    
    // Return full public URL for Instagram compatibility
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const url = `${baseUrl}/uploads/${sanitizedName}`
    
    return NextResponse.json(
      { 
        success: true,
        url,
        filename: sanitizedName,
        size: file.size,
        type: file.type
      },
      { headers: rateLimitResult.headers }
    )
  } catch (error: any) {
    return handleApiError(error)
  }
}
