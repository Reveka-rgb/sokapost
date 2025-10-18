'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth-client'
import { 
  FiCalendar, 
  FiBarChart2, 
  FiImage, 
  FiSettings,
  FiSearch,
  FiHelpCircle,
  FiFileText,
  FiLink,
  FiTrendingUp,
  FiMessageSquare
} from 'react-icons/fi'
import { MdAutoAwesome } from 'react-icons/md'
import axios from 'axios'

const menuItems = [
  { name: 'Calendar', href: '/calendar', icon: FiCalendar },
  { name: 'Schedule', href: '/posts', icon: FiFileText },
  { name: 'Media', href: '/media', icon: FiImage },
]

const threadsMenuItems = [
  { name: 'AI Insight', href: '/smart-analytics', icon: FiTrendingUp },
  { name: 'Insights', href: '/insights', icon: FiBarChart2 },
  { name: 'Comments', href: '/threads-comments', icon: FiMessageSquare },
  { name: 'Auto Reply', href: '/auto-reply', icon: MdAutoAwesome },
  { name: 'Search', href: '/search', icon: FiSearch },
]

// Instagram - Only for posting/scheduling (handled in Calendar/Posts pages)
// Comments/Insights not available due to API limitations

const bottomItems = [
  { name: 'Connections', href: '/connections', icon: FiLink },
  { name: 'Settings', href: '/settings', icon: FiSettings },
  { name: 'Help', href: '/help', icon: FiHelpCircle },
]

interface Account {
  platform: string
  username: string
  profile_picture_url?: string
}

export default function Sidebar() {
  const pathname = usePathname()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/api/accounts')
      const { threads, instagram } = response.data

      const accts: Account[] = []
      if (threads.connected) {
        accts.push({ 
          platform: 'Threads', 
          username: threads.username,
          profile_picture_url: threads.profile_picture_url
        })
      }
      if (instagram.connected) {
        accts.push({ 
          platform: 'Instagram', 
          username: instagram.username,
          profile_picture_url: instagram.profile_picture_url
        })
      }
      setAccounts(accts)
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hidden md:flex w-60 bg-white border-r border-gray-200 flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <span className="text-base font-semibold text-gray-900">SOKAPOST</span>
        </div>
      </div>

      {/* Channels */}
      <div className="px-4 py-3 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Channels
        </p>
        <div className="space-y-2">
          {loading ? (
            <div className="text-xs text-gray-400">Loading...</div>
          ) : accounts.length === 0 ? (
            <div className="text-xs text-gray-400">No channels connected</div>
          ) : (
            accounts.map((account, index) => (
              <Link
                key={index}
                href="/calendar"
                className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {account.profile_picture_url ? (
                  <img
                    src={account.profile_picture_url}
                    alt={account.username}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                    {account.username[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    @{account.username}
                  </p>
                  <p className="text-xs text-gray-500">{account.platform}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            )
          })}

          {/* Threads Section */}
          <li className="pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">
              Threads
            </p>
          </li>

          {/* Threads Menu Items */}
          {threadsMenuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            )
          })}

          {/* Instagram - Posting only (via Calendar/Posts pages) */}
        </ul>
      </nav>

      {/* Bottom Items */}
      <div className="px-4 py-3 border-t border-gray-200">
        <ul className="space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
