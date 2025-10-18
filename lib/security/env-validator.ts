interface EnvConfig {
  key: string
  required: boolean
  type: 'string' | 'url' | 'number'
  minLength?: number
  description: string
}

const envConfigs: EnvConfig[] = [
  // Database
  {
    key: 'DATABASE_URL',
    required: true,
    type: 'string',
    description: 'Database connection URL',
  },
  
  // Authentication
  {
    key: 'BETTER_AUTH_SECRET',
    required: true,
    type: 'string',
    minLength: 32,
    description: 'Better Auth secret key (min 32 chars)',
  },
  {
    key: 'BETTER_AUTH_URL',
    required: true,
    type: 'url',
    description: 'Better Auth base URL',
  },

  // Encryption
  {
    key: 'ENCRYPTION_KEY',
    required: true,
    type: 'string',
    minLength: 32,
    description: 'AES encryption key (min 32 chars)',
  },

  // APIs
  {
    key: 'GEMINI_API_KEY',
    required: true,
    type: 'string',
    description: 'Google Gemini API key',
  },
  {
    key: 'THREADS_CLIENT_ID',
    required: true,
    type: 'string',
    description: 'Threads Client ID',
  },
  {
    key: 'THREADS_CLIENT_SECRET',
    required: true,
    type: 'string',
    description: 'Threads Client Secret',
  },
  {
    key: 'FACEBOOK_APP_ID',
    required: false,
    type: 'string',
    description: 'Facebook/Instagram App ID (optional)',
  },
  {
    key: 'FACEBOOK_APP_SECRET',
    required: false,
    type: 'string',
    description: 'Facebook/Instagram App Secret (optional)',
  },

  // App Config
  {
    key: 'NEXT_PUBLIC_APP_URL',
    required: true,
    type: 'url',
    description: 'Public app URL',
  },

  // Optional: Redis for rate limiting
  {
    key: 'UPSTASH_REDIS_REST_URL',
    required: false,
    type: 'url',
    description: 'Upstash Redis URL (optional, for distributed rate limiting)',
  },
  {
    key: 'UPSTASH_REDIS_REST_TOKEN',
    required: false,
    type: 'string',
    description: 'Upstash Redis token (optional)',
  },
]

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

function validateEnvVar(config: EnvConfig): string | null {
  const value = process.env[config.key]

  // Check if required
  if (config.required && !value) {
    return `❌ ${config.key} is required but not set (${config.description})`
  }

  if (!value) {
    return null // Optional and not set, skip validation
  }

  // Check type
  if (config.type === 'url' && !isValidUrl(value)) {
    return `❌ ${config.key} must be a valid URL`
  }

  if (config.type === 'number' && isNaN(Number(value))) {
    return `❌ ${config.key} must be a number`
  }

  // Check min length
  if (config.minLength && value.length < config.minLength) {
    return `❌ ${config.key} must be at least ${config.minLength} characters`
  }

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    // Check for weak secrets
    if (config.key.includes('SECRET') || config.key.includes('KEY')) {
      if (value.length < 32) {
        return `⚠️ ${config.key} is too short for production (min 32 chars recommended)`
      }
      if (/^(test|dev|demo|example|changeme)/i.test(value)) {
        return `❌ ${config.key} contains weak/default value in production`
      }
    }

    // Check for localhost URLs in production
    if (config.type === 'url' && value.includes('localhost')) {
      return `❌ ${config.key} cannot use localhost in production`
    }
  }

  return null
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  console.log('🔍 Validating environment variables...')

  for (const config of envConfigs) {
    const error = validateEnvVar(config)
    if (error) {
      if (error.startsWith('⚠️')) {
        warnings.push(error)
      } else {
        errors.push(error)
      }
    }
  }

  const valid = errors.length === 0

  if (valid && warnings.length === 0) {
    console.log('✅ All environment variables validated successfully')
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️ Environment Warnings:')
    warnings.forEach(warning => console.warn(warning))
  }

  if (errors.length > 0) {
    console.error('\n❌ Environment Validation Errors:')
    errors.forEach(error => console.error(error))
  }

  // Log configuration summary
  console.log('\n📋 Configuration Summary:')
  console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`- Database: ${process.env.DATABASE_URL ? '✓' : '✗'}`)
  console.log(`- Auth: ${process.env.BETTER_AUTH_SECRET ? '✓' : '✗'}`)
  console.log(`- Encryption: ${process.env.ENCRYPTION_KEY ? '✓' : '✗'}`)
  console.log(`- Gemini AI: ${process.env.GEMINI_API_KEY ? '✓' : '✗'}`)
  console.log(`- Threads: ${process.env.THREADS_CLIENT_ID ? '✓' : '✗'}`)
  console.log(`- Instagram: ${process.env.FACEBOOK_APP_ID ? '✓' : '✗'}`)
  console.log(`- Redis (optional): ${process.env.UPSTASH_REDIS_REST_URL ? '✓' : '✗ (using in-memory)'}`)

  return { valid, errors, warnings }
}
