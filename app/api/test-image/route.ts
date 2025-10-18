import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  try {
    // Test if image is accessible
    const response = await axios.head(imageUrl, {
      timeout: 5000,
      validateStatus: (status) => status < 500
    })

    return NextResponse.json({
      accessible: response.status === 200,
      status: response.status,
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length'],
      headers: response.headers,
      message: response.status === 200 
        ? '✅ Image is accessible from internet' 
        : `❌ Image returned status ${response.status}`
    })
  } catch (error: any) {
    return NextResponse.json({
      accessible: false,
      error: error.message,
      message: '❌ Image is NOT accessible from internet',
      details: {
        code: error.code,
        url: imageUrl
      }
    }, { status: 500 })
  }
}
