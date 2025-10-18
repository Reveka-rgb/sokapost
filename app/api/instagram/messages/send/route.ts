import { NextResponse } from 'next/server'

// Instagram Messaging API - Coming Soon
export async function POST(request: Request) {
  return NextResponse.json(
    { 
      error: 'Coming Soon',
      message: 'Instagram messaging feature is currently disabled.'
    }, 
    { status: 503 }
  )
}
