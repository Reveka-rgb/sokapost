import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./prisma"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectURI: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
    // Cookie name bisa di-customize per environment untuk hindari conflict
    // Set BETTER_AUTH_COOKIE_PREFIX di .env untuk folder berbeda
    cookieName: process.env.BETTER_AUTH_COOKIE_PREFIX 
      ? `${process.env.BETTER_AUTH_COOKIE_PREFIX}_session` 
      : "better-auth.session",
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "",
    "http://localhost:3000",
  ],
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
})

export type Session = typeof auth.$Infer.Session
