import cron, { ScheduledTask } from 'node-cron'
import { prisma } from '@/lib/prisma'
import { refreshLongLivedToken } from '@/lib/api/threads'
import { encryptToken, decryptToken } from '@/lib/utils/encryption'

let tokenRefreshJob: ScheduledTask | null = null

export function startTokenRefreshJob() {
  if (tokenRefreshJob) {
    console.log('⚠️ Token refresh job already running')
    return
  }

  // Run daily at 2 AM
  tokenRefreshJob = cron.schedule('0 2 * * *', async () => {
    try {
      console.log('🔄 Starting token refresh job...')

      // Find Threads accounts that expire in less than 7 days
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

      const accountsToRefresh = await prisma.threadsAccount.findMany({
        where: {
          expiresAt: {
            lte: sevenDaysFromNow
          }
        }
      })

      console.log(`Found ${accountsToRefresh.length} accounts to refresh`)

      for (const account of accountsToRefresh) {
        try {
          const currentToken = decryptToken(account.accessToken)
          
          // Refresh token
          const newToken = await refreshLongLivedToken(currentToken)

          // Update in database
          await prisma.threadsAccount.update({
            where: { id: account.id },
            data: {
              accessToken: encryptToken(newToken.access_token),
              expiresAt: new Date(Date.now() + newToken.expires_in * 1000)
            }
          })

          console.log(`✅ Refreshed token for user ${account.userId}`)
        } catch (error) {
          console.error(`❌ Failed to refresh token for account ${account.id}:`, error)
        }
      }

      console.log('✅ Token refresh job completed')
    } catch (error) {
      console.error('Token refresh job error:', error)
    }
  })

  console.log('🔄 Token refresh job started - runs daily at 2 AM')
}

export function stopTokenRefreshJob() {
  if (tokenRefreshJob) {
    tokenRefreshJob.stop()
    tokenRefreshJob = null
    console.log('⏹️ Token refresh job stopped')
  }
}

export function getTokenRefreshStatus() {
  return {
    running: tokenRefreshJob !== null
  }
}
