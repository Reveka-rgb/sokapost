import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export const ERROR_CODES = {
  UNAUTHORIZED: {
    status: 401,
    message: 'Unauthorized. Please log in.',
    code: 'UNAUTHORIZED',
  },
  FORBIDDEN: {
    status: 403,
    message: 'Access forbidden.',
    code: 'FORBIDDEN',
  },
  NOT_FOUND: {
    status: 404,
    message: 'Resource not found.',
    code: 'NOT_FOUND',
  },
  VALIDATION_ERROR: {
    status: 400,
    message: 'Invalid input data.',
    code: 'VALIDATION_ERROR',
  },
  RATE_LIMIT: {
    status: 429,
    message: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT',
  },
  INTERNAL_ERROR: {
    status: 500,
    message: 'Internal server error. Please try again later.',
    code: 'INTERNAL_ERROR',
  },
  BAD_REQUEST: {
    status: 400,
    message: 'Bad request.',
    code: 'BAD_REQUEST',
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    message: 'Service temporarily unavailable. Please try again later.',
    code: 'SERVICE_UNAVAILABLE',
  },
} as const

export type ErrorCode = keyof typeof ERROR_CODES

export class ApiError extends Error {
  status: number
  code: string
  details?: any

  constructor(errorCode: ErrorCode, details?: any) {
    const errorConfig = ERROR_CODES[errorCode]
    super(errorConfig.message)
    this.status = errorConfig.status
    this.code = errorConfig.code
    this.details = details
    this.name = 'ApiError'
  }
}

export function createApiError(errorCode: ErrorCode, details?: any): ApiError {
  return new ApiError(errorCode, details)
}

export function handleApiError(error: unknown): NextResponse {
  // Generate request ID for tracking
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`

  // Handle known API errors
  if (error instanceof ApiError) {
    console.error(`[${requestId}] API Error:`, {
      code: error.code,
      status: error.status,
      message: error.message,
      details: error.details,
    })

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
        requestId,
      },
      { status: error.status }
    )
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    console.error(`[${requestId}] Validation Error:`, error.errors)

    return NextResponse.json(
      {
        error: 'Invalid input data',
        code: 'VALIDATION_ERROR',
        details: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        })),
        requestId,
      },
      { status: 400 }
    )
  }

  // Handle generic errors
  if (error instanceof Error) {
    console.error(`[${requestId}] Unexpected Error:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })

    // Don't expose internal error details to client
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        requestId,
      },
      { status: 500 }
    )
  }

  // Handle unknown errors
  console.error(`[${requestId}] Unknown Error:`, error)

  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      requestId,
    },
    { status: 500 }
  )
}
