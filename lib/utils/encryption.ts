import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''

if (!ENCRYPTION_KEY) {
  console.warn('⚠️ ENCRYPTION_KEY not set in environment variables')
}

export function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is required')
  }
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString()
}

export function decryptToken(encryptedToken: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is required')
  }
  const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}
