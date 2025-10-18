import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/utils/encryption'
import axios from 'axios'

const THREADS_API_BASE = 'https://graph.threads.net/v1.0'

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { text, imageUrl } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 })
    }

    // Get Threads account
    const threadsAccount = await prisma.threadsAccount.findUnique({
      where: { userId: session.user.id }
    })

    if (!threadsAccount) {
      return NextResponse.json({ error: 'No Threads account' }, { status: 404 })
    }

    const accessToken = decryptToken(threadsAccount.accessToken)
    const userId = threadsAccount.threadsUserId

    console.log('Testing Threads API with:', {
      userId,
      text: text.substring(0, 50),
      hasImage: !!imageUrl,
      imageUrl
    })

    // Step 1: Create container
    const containerParams: any = {
      media_type: imageUrl ? 'IMAGE' : 'TEXT',
      text,
      access_token: accessToken,
    }

    if (imageUrl) {
      // Convert to absolute URL if needed
      const fullImageUrl = imageUrl.startsWith('http') 
        ? imageUrl 
        : `${process.env.NEXT_PUBLIC_APP_URL}${imageUrl}`
      
      containerParams.image_url = fullImageUrl
      console.log('Using image URL:', fullImageUrl)
    }

    console.log('Creating container...')
    const containerResponse = await axios.post(
      `${THREADS_API_BASE}/${userId}/threads`,
      null,
      { params: containerParams }
    )

    console.log('Container created:', containerResponse.data)
    const containerId = containerResponse.data.id

    if (!containerId) {
      return NextResponse.json({ 
        error: 'No container ID',
        response: containerResponse.data 
      }, { status: 500 })
    }

    // Wait for container to be ready
    console.log('Waiting 3 seconds for container to be ready...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Step 2: Publish container
    console.log('Publishing container:', containerId)
    const publishResponse = await axios.post(
      `${THREADS_API_BASE}/${userId}/threads_publish`,
      null,
      {
        params: {
          creation_id: containerId,
          access_token: accessToken,
        },
      }
    )

    console.log('Publish response:', publishResponse.data)

    return NextResponse.json({
      success: true,
      container: containerResponse.data,
      published: publishResponse.data,
      message: 'Post created successfully! Check your Threads profile.'
    })
  } catch (error: any) {
    console.error('Test error:', error)
    return NextResponse.json(
      { 
        error: 'Test failed',
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      },
      { status: 500 }
    )
  }
}
