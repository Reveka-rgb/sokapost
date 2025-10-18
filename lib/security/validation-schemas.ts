import { z } from 'zod'

// Post schemas
export const createPostSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
  platform: z.enum(['threads', 'instagram'], {
    errorMap: () => ({ message: 'Platform must be either threads or instagram' })
  }).default('threads'),
  scheduledAt: z.string().datetime().nullable().optional(),
  mediaUrls: z.array(z.string().url('Invalid media URL')).max(10, 'Maximum 10 media files').optional(),
  publishImmediately: z.boolean().optional(),
  status: z.enum(['draft', 'scheduled', 'published']).optional(),
  topic: z.string().max(100, 'Topic too long').optional(),
  location: z.string().max(200, 'Location too long').optional(),
})

export const updatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  platform: z.enum(['threads', 'instagram']).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  status: z.enum(['draft', 'scheduled', 'published']).optional(),
  topic: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
})

// AI generation schema
export const aiGenerateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long'),
  context: z.string().max(500).optional(),
})

// Auto-reply schemas
export const autoReplySettingsSchema = z.object({
  enabled: z.boolean(),
  replyDelay: z.number().int().min(1).max(60).default(5),
  useAI: z.boolean().default(false),
  replyTemplate: z.string().max(500).optional(),
})

export const autoReplyKeywordSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(100, 'Keyword too long'),
  response: z.string().min(1, 'Response is required').max(500, 'Response too long'),
  isActive: z.boolean().default(true),
})

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

// File upload schema
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  type: z.enum(['image', 'video']),
})

export const fileValidation = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  video: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['video/mp4', 'video/quicktime'],
    allowedExtensions: ['.mp4', '.mov'],
  },
}

// Threads/Instagram connection schema
export const connectAccountSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
})

// Sanitize filename to prevent path traversal
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .substring(0, 255)
}

// Validate file type and size
export function validateFile(
  file: File,
  type: 'image' | 'video'
): { valid: boolean; error?: string } {
  const config = fileValidation[type]

  if (!config.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${config.allowedExtensions.join(', ')}`,
    }
  }

  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${config.maxSize / (1024 * 1024)}MB`,
    }
  }

  return { valid: true }
}
