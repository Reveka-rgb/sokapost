'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  FiCalendar, 
  FiBarChart2,
  FiLink,
  FiMenu,
  FiX,
  FiImage,
  FiSettings,
  FiSearch,
  FiHelpCircle,
  FiFileText,
  FiLogOut
} from 'react-icons/fi'
import { MdAutoAwesome } from 'react-icons/md'
import { signOut } from '@/lib/auth-client'

const mainNavItems = [
  { name: 'Calendar', href: '/calendar', icon: FiCalendar },
  { name: 'Insights', href: '/insights', icon: FiBarChart2 },
  { name: 'Connections', href: '/connections', icon: FiLink },
  { name: 'Auto Reply', href: '/auto-reply', icon: MdAutoAwesome },
]

const allMenuItems = [
  { name: 'Calendar', href: '/calendar', icon: FiCalendar },
  { name: 'Posts', href: '/posts', icon: FiFileText },
  { name: 'Insights', href: '/insights', icon: FiBarChart2 },
  { name: 'Auto Reply', href: '/auto-reply', icon: MdAutoAwesome },
  { name: 'Media', href: '/media', icon: FiImage },
  { name: 'Search', href: '/search', icon: FiSearch },
  { name: 'Connections', href: '/connections', icon: FiLink },
  { name: 'Settings', href: '/settings', icon: FiSettings },
  { name: 'Help', href: '/help', icon: FiHelpCircle },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <>
      {/* Bottom Navigation - COMPACT */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
        <div className="flex items-center justify-around px-1 py-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-colors min-w-0 ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 active:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-[9px] mt-0.5 font-medium truncate">{item.name}</span>
              </Link>
            )
          })}
          
          {/* Menu Button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center justify-center px-2 py-1 rounded-lg text-gray-600 active:bg-gray-100 transition-colors min-w-0"
          >
            <FiMenu className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] mt-0.5 font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Full Screen Menu Modal - COMPACT */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-50 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2.5 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Menu</h2>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="p-3 space-y-1">
            {allMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 active:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              )
            })}

            {/* Divider */}
            <div className="my-3 border-t border-gray-200"></div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-red-600 active:bg-red-50 transition-colors"
            >
              <FiLogOut className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
