import { startPostScheduler } from './scheduler'
import { startTokenRefreshJob } from './token-refresh'
import { startAutoReplyScheduler } from './auto-reply-scheduler'

let initialized = false

export function initializeBackgroundJobs() {
  if (initialized) {
    console.log('⚠️ Background jobs already initialized')
    return
  }

  console.log('🚀 Initializing background jobs...')

  // Start post scheduler
  startPostScheduler()

  // Start token refresh job
  startTokenRefreshJob()

  // Start auto-reply scheduler
  startAutoReplyScheduler()

  initialized = true
  console.log('✅ Background jobs initialized')
}

export function shutdownBackgroundJobs() {
  const { stopPostScheduler } = require('./scheduler')
  const { stopTokenRefreshJob } = require('./token-refresh')

  stopPostScheduler()
  stopTokenRefreshJob()

  initialized = false
  console.log('🛑 Background jobs stopped')
}

// Graceful shutdown
process.on('SIGTERM', shutdownBackgroundJobs)
process.on('SIGINT', shutdownBackgroundJobs)
