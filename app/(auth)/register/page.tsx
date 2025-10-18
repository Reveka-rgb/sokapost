'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiAlertCircle } from 'react-icons/fi'
import { useEffect } from 'react'

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login after 3 seconds
    const timer = setTimeout(() => {
      router.push('/login')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <FiAlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Disabled</h1>
          <p className="text-gray-600">New user registration is currently disabled</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 mb-2">
            To create a new account, please use <strong>Google Sign In</strong> on the login page.
          </p>
          <p className="text-xs text-gray-600">
            This ensures your account is verified and secure.
          </p>
        </div>

        <Link
          href="/login"
          className="block w-full bg-brand-600 text-white text-center py-3 px-4 rounded-lg hover:bg-brand-700 transition-colors font-medium"
        >
          Go to Login Page
        </Link>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Redirecting automatically in 3 seconds...
          </p>
        </div>
      </div>
    </div>
  )
}
