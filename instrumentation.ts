// instrumentation.ts - runs once on server start
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate environment variables
    const { validateEnvironment } = await import('./lib/security/env-validator')
    const validation = validateEnvironment()
    
    if (!validation.valid) {
      console.error('❌ Environment validation failed. Please check configuration.')
      // Note: Only warning in production, app will still start
      console.warn('⚠️ Starting anyway, but please fix environment variables')
    }
    
    // Initialize background jobs
    const { initializeBackgroundJobs } = await import('./lib/services/init')
    initializeBackgroundJobs()
  }
}
