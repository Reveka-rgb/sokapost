'use client'

import { useState, useEffect } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useSession } from '@/lib/auth-client'
import CreatePostModal from '@/components/features/CreatePostModal'
import axios from 'axios'
import Link from 'next/link'

export default function DashboardHeader() {
  const { data: session } = useSession()
  const [showModal, setShowModal] = useState(false)
  const [username, setUsername] = useState<string>('')
  const [userPhoto, setUserPhoto] = useState<string>('')
  const [prefilledDate, setPrefilledDate] = useState<string>('')
  const [prefilledTime, setPrefilledTime] = useState<string>('')
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetchUserData()
    
    // Listen for create post event from calendar
    const handleOpenCreatePost = (e: any) => {
      const { date, time } = e.detail
      setPrefilledDate(date)
      setPrefilledTime(time)
      setShowModal(true)
    }
    
    window.addEventListener('openCreatePost', handleOpenCreatePost as EventListener)
    
    return () => {
      window.removeEventListener('openCreatePost', handleOpenCreatePost as EventListener)
    }
  }, [])

  const fetchUserData = async () => {
    try {
      const response = await axios.get('/api/accounts')
      const { threads, instagram } = response.data

      // Prioritize Threads, fallback to Instagram
      if (threads.connected) {
        setUsername(threads.username)
        setUserPhoto(threads.profile_picture_url || '')
      } else if (instagram.connected) {
        setUsername(instagram.username)
        setUserPhoto(instagram.profile_picture_url || '')
      } else {
        setUsername('User')
        setUserPhoto('')
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      setUsername('User')
      setUserPhoto('')
    }
  }

  return (
    <>
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between md:justify-end gap-4 px-4 md:px-6 py-3">
          {/* Logo - Mobile Only */}
          <Link href="/calendar" className="flex md:hidden items-center gap-2">
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">SOKAPOST</span>
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* New Post Button - Mobile: Link, Desktop: Modal */}
            {isMobile ? (
              <Link
                href="/mobile-create-post"
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
              >
                <FiPlus className="w-4 h-4" />
                <span className="hidden sm:inline">New</span>
              </Link>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
              >
                <FiPlus className="w-4 h-4" />
                <span className="hidden sm:inline">New</span>
              </button>
            )}

            {/* Profile Button */}
            <Link
              href="/settings"
              className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              title={session?.user?.name || 'Profile'}
            >
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-8 h-8 rounded-full shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop Modal Only */}
      {!isMobile && (
        <CreatePostModal 
          isOpen={showModal} 
          onClose={() => {
            setShowModal(false)
            setPrefilledDate('')
            setPrefilledTime('')
          }}
          username={username}
          userPhoto={userPhoto}
          prefilledDate={prefilledDate}
          prefilledTime={prefilledTime}
        />
      )}
    </>
  )
}
