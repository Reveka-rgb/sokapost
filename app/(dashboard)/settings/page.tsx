'use client'

import { useSession, signOut } from '@/lib/auth-client'
import { redirect, useRouter } from 'next/navigation'
import { FiLogOut, FiUser, FiMail, FiCalendar } from 'react-icons/fi'
import Link from 'next/link'

export default function SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()

  if (!session?.user) {
    redirect('/login')
  }

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl space-y-4">
          
          {/* Account Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Account Information</h3>
            
            <div className="flex items-start gap-4 mb-6">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-16 h-16 rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || session?.user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500 mb-1">Signed in with Google</p>
                <h4 className="text-lg font-semibold text-gray-900 truncate">{session?.user?.name || 'User'}</h4>
                <p className="text-sm text-gray-600 truncate">{session?.user?.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <FiUser className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600">Name:</span>
                <span className="font-medium text-gray-900">{session?.user?.name || '-'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FiMail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-gray-900 truncate">{session?.user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FiCalendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600">Account Type:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Google Account
                </span>
              </div>
            </div>
          </div>

          {/* Social Media Connections */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Social Media Connections</h3>
            <p className="text-sm text-gray-600 mb-4">Manage your connected social media accounts</p>
            <Link
              href="/connections"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Manage Connections
            </Link>
          </div>

          <hr className="border-gray-200" />

          {/* Logout Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Sign Out</h3>
            <p className="text-sm text-gray-600 mb-4">
              Sign out from your account on this device
            </p>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FiLogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
