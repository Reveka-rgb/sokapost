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
  FiLogOut,
  FiEdit3,
  FiTrendingUp
} from 'react-icons/fi'
import { MdAutoAwesome } from 'react-icons/md'
import { signOut } from '@/lib/auth-client'

const mainNavItems = [
  { name: 'Calendar', href: '/calendar', icon: FiCalendar },
  { name: 'Posts', href: '/posts', icon: FiFileText },
  { name: 'Create', href: '/mobile-create-post', icon: FiEdit3 },
  { name: 'Connections', href: '/connections', icon: FiLink },
]

const menuSections = [
  {
    title: 'Utama',
    items: [
      { name: 'Calendar', href: '/calendar', icon: FiCalendar },
      { name: 'Posts', href: '/posts', icon: FiFileText },
      { name: 'Media', href: '/media', icon: FiImage },
    ]
  },
  {
    title: 'Threads',
    items: [
      { name: 'AI Insight', href: '/smart-analytics', icon: FiTrendingUp },
      { name: 'Insights', href: '/insights', icon: FiBarChart2 },
      { name: 'Auto Reply', href: '/auto-reply', icon: MdAutoAwesome },
      { name: 'Search', href: '/search', icon: FiSearch },
    ]
  },
  {
    title: 'Connections',
    items: [
      { name: 'Connections', href: '/connections', icon: FiLink },
    ]
  },
  {
    title: 'Account',
    items: [
      { name: 'Settings', href: '/settings', icon: FiSettings },
      { name: 'Help', href: '/help', icon: FiHelpCircle },
    ]
  }
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

      {/* Full Screen Menu Modal */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-50 flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Semua Menu</h2>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              <FiX className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* Menu Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {menuSections.map((section, sectionIndex) => (
                <div key={section.title} className={sectionIndex > 0 ? 'mt-6' : ''}>
                  {/* Section Title */}
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                    {section.title}
                  </h3>
                  
                  {/* Section Items */}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-700 active:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm font-medium">{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Divider */}
              <div className="my-6 border-t border-gray-200"></div>

              {/* Sign Out */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-600 active:bg-red-50 transition-colors"
              >
                <FiLogOut className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
