import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
})

export const { signIn, signUp, useSession } = authClient

export const signOut = async () => {
  try {
    // Call Better Auth sign out which clears httpOnly cookies server-side
    await authClient.signOut()
  } catch (error) {
    console.error('Sign out error:', error)
  } finally {
    // Always redirect to login with full page reload after sign out attempt
    // Use setTimeout to ensure sign out API call completes
    setTimeout(() => {
      window.location.replace('/login')
    }, 200)
  }
}
