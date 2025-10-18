import { NextResponse } from 'next/server'

// Instagram Messaging API - Coming Soon
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { 
      error: 'Coming Soon',
      message: 'Instagram messaging feature is currently disabled.'
    }, 
    { status: 503 }
  )
}
