import { auth } from './better-auth'
import { headers } from 'next/headers'

/**
 * Get current session in API routes
 * Usage: const session = await getServerSession()
 */
export async function getServerSession() {
  try {
    const result = await auth.api.getSession({
      headers: await headers()
    })
    
    // Better Auth returns { session, user } structure
    if (result?.session && result?.user) {
      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          image: result.user.image,
        },
        session: result.session
      }
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Require authentication in API routes
 * Throws error if not authenticated
 */
export async function requireAuth() {
  const session = await getServerSession()
  
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  
  return session
}
