'use client'

import { useEffect, useState, useMemo } from 'react'
import { Calendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { FiChevronLeft, FiChevronRight, FiPlus } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import PostDetailModal from './PostDetailModal'
import MobileCalendar from './MobileCalendar'

const localizer = momentLocalizer(moment)

interface Post {
  id: string
  content: string
  scheduledAt: string | null
  publishedAt: string | null
  status: string
  platform: string
  threadsPostId: string | null
  mediaUrl?: string
  mediaType?: string
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Post
}

export default function CalendarView({ userId }: { userId: string }) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<View>('month')
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch accounts (Threads & Instagram) dengan caching
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await axios.get('/api/accounts')
      return response.data
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (account info jarang berubah)
  })

  // Extract account data
  const threadsAccount = accountsData?.threads
  const instagramAccount = accountsData?.instagram

  // Fetch database posts (scheduled & draft) dengan caching
  const { data: dbPostsData, isLoading: isLoadingDbPosts } = useQuery({
    queryKey: ['database-posts'],
    queryFn: async () => {
      const response = await axios.get('/api/posts')
      return response.data.posts || []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (data bisa berubah lebih sering)
  })

  // Fetch Threads posts (published) dengan caching - only if Threads connected
  const { data: threadsPostsData, isLoading: isLoadingThreadsPosts } = useQuery({
    queryKey: ['threads-posts'],
    queryFn: async () => {
      const response = await axios.get('/api/threads/insights')
      return response.data.posts || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Retry 1x kalau gagal
    enabled: threadsAccount?.connected === true, // Only fetch if Threads connected
  })
  
  const username = threadsAccount?.connected 
    ? threadsAccount.username 
    : instagramAccount?.connected 
      ? instagramAccount.username 
      : ''
  const profilePictureUrl = threadsAccount?.connected 
    ? threadsAccount.profile_picture_url 
    : instagramAccount?.connected 
      ? instagramAccount.profile_picture_url 
      : ''
  const allThreadsPosts = threadsPostsData || []
  const loading = isLoadingDbPosts || isLoadingThreadsPosts

  // Compute calendar events dari cached data (no API calls!)
  const events = useMemo(() => {
    if (!dbPostsData && !threadsPostsData) return []

    const dbPosts: Post[] = dbPostsData || []
    const threadsPosts: any[] = threadsPostsData || []

    // Convert database posts to calendar events
    const dbEvents: CalendarEvent[] = dbPosts
      .filter((post: Post) => post.scheduledAt || post.publishedAt)
      .map((post: Post) => {
        const date = post.publishedAt 
          ? new Date(post.publishedAt) 
          : new Date(post.scheduledAt!)
        
        return {
          id: post.id,
          title: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
          start: date,
          end: date,
          resource: post
        }
      })

    // Combine and deduplicate events
    const allEvents = [...dbEvents]
    
    // Add Threads posts that don't exist in DB
    threadsPosts.forEach((threadsPost: any) => {
      const existsInDb = dbEvents.some(
        (event) => event.resource.threadsPostId === threadsPost.id
      )
      
      if (!existsInDb) {
        const date = new Date(threadsPost.timestamp)
        allEvents.push({
          id: `threads-${threadsPost.id}`,
          title: (threadsPost.text || 'Media post').substring(0, 50) + ((threadsPost.text || '').length > 50 ? '...' : ''),
          start: date,
          end: date,
          resource: {
            id: threadsPost.id,
            content: threadsPost.text || 'Media post',
            scheduledAt: null,
            publishedAt: threadsPost.timestamp,
            status: 'published',
            platform: 'threads',
            threadsPostId: threadsPost.id,
            mediaUrl: threadsPost.media_url,
            mediaType: threadsPost.media_type
          }
        })
      }
    })

    return allEvents
  }, [dbPostsData, threadsPostsData])

  // Convert events to posts for mobile calendar - MUST be before any conditional returns
  const postsForMobile = useMemo(() => {
    return events.map(e => e.resource)
  }, [events])

  const eventStyleGetter = (event: CalendarEvent) => {
    const post = event.resource
    let borderLeftColor = '#94a3b8' // gray
    
    if (post.status === 'published') {
      borderLeftColor = '#10b981' // green
    } else if (post.status === 'scheduled') {
      borderLeftColor = '#3b82f6' // blue
    } else if (post.status === 'failed') {
      borderLeftColor = '#ef4444' // red
    }

    return {
      style: {
        backgroundColor: 'white',
        borderLeft: `3px solid ${borderLeftColor}`,
        borderRadius: '6px',
        color: '#374151',
        border: '1px solid #e5e7eb',
        borderLeftWidth: '3px',
        borderLeftColor: borderLeftColor,
        display: 'block',
        padding: '0'
      }
    }
  }

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const post = event.resource
    
    // Get status icon
    const getStatusIcon = () => {
      if (post.status === 'published') return '✓'
      if (post.status === 'scheduled') return '○'
      if (post.status === 'failed') return '✕'
      return '◌'
    }
    
    return (
      <div className="flex items-center justify-between px-2 py-1.5 w-full">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Platform Logo */}
          {post.platform === 'instagram' ? (
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
              </svg>
            </div>
          ) : (
            <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[8px] font-bold">@</span>
            </div>
          )}
          <span className="text-sm font-medium text-gray-800 truncate">{moment(event.start).format('h:mm A')}</span>
        </div>
        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{getStatusIcon()}</span>
      </div>
    )
  }

  // Custom Date Cell with + button
  const CustomDateCell = ({ value, children }: any) => {
    const handleAddPost = (e: React.MouseEvent) => {
      e.stopPropagation()
      
      // Get the clicked date
      const clickedDate = moment(value)
      const now = moment()
      
      // Set default time based on whether it's today or future
      let defaultTime = '09:00'
      
      if (clickedDate.isSame(now, 'day')) {
        // If today, set time to current time + 1 hour
        const nextHour = now.add(1, 'hour')
        defaultTime = nextHour.format('HH:mm')
      }
      
      const dateStr = clickedDate.format('YYYY-MM-DD')
      
      // Dispatch event to open modal with prefilled date/time
      if (typeof window !== 'undefined') {
        const event = new Event('openCreatePost') as any
        event.detail = { date: dateStr, time: defaultTime }
        window.dispatchEvent(event)
      }
    }

    return (
      <div className="rbc-day-bg relative">
        {children}
        <button
          onClick={handleAddPost}
          className="absolute bottom-1 left-1 w-5 h-5 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm z-10"
          title="Create post for this date"
        >
          <FiPlus className="w-3 h-3" />
        </button>
      </div>
    )
  }

  // Custom day prop getter - untuk styling tanggal berdasarkan waktu
  const dayPropGetter = (date: Date) => {
    const today = moment().startOf('day')
    const dateToCheck = moment(date).startOf('day')
    
    if (dateToCheck.isSame(today, 'day')) {
      // Today - clean white
      return {
        style: {
          backgroundColor: '#ffffff'
        }
      }
    } else if (dateToCheck.isBefore(today)) {
      // Past dates - light gray untuk clean look
      return {
        className: 'past-date',
        style: {
          backgroundColor: '#f3f4f6'
        }
      }
    } else {
      // Future dates - clean white
      return {
        className: 'future-date',
        style: {
          backgroundColor: '#ffffff'
        }
      }
    }
  }

  // Custom Toolbar
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV')
    }

    const goToNext = () => {
      toolbar.onNavigate('NEXT')
    }

    const goToToday = () => {
      toolbar.onNavigate('TODAY')
    }

    const label = () => {
      const date = moment(toolbar.date)
      return (
        <span className="text-base md:text-xl font-bold text-gray-900">
          {date.format('MMMM YYYY')}
        </span>
      )
    }

    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-200">
        {/* Left: Today button */}
        <div>
          <button
            onClick={goToToday}
            className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
          >
            Today
          </button>
        </div>

        {/* Center: Month/Year with arrows */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={goToBack}
            className="p-1 md:p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Previous"
          >
            <FiChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
          </button>
          {label()}
          <button
            onClick={goToNext}
            className="p-1 md:p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Next"
          >
            <FiChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
          </button>
        </div>

        {/* Right: View buttons */}
        <div className="flex items-center gap-0.5 md:gap-1 bg-gray-100 rounded-lg p-0.5 md:p-1 w-full sm:w-auto">
          <button
            onClick={() => toolbar.onView('month')}
            className={`flex-1 sm:flex-none px-2 md:px-3 py-1 text-xs md:text-sm rounded transition-colors ${
              toolbar.view === 'month'
                ? 'bg-white text-gray-900 font-medium shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => toolbar.onView('week')}
            className={`flex-1 sm:flex-none px-2 md:px-3 py-1 text-xs md:text-sm rounded transition-colors ${
              toolbar.view === 'week'
                ? 'bg-white text-gray-900 font-medium shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => toolbar.onView('day')}
            className={`flex-1 sm:flex-none px-2 md:px-3 py-1 text-xs md:text-sm rounded transition-colors ${
              toolbar.view === 'day'
                ? 'bg-white text-gray-900 font-medium shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => toolbar.onView('agenda')}
            className={`flex-1 sm:flex-none px-2 md:px-3 py-1 text-xs md:text-sm rounded transition-colors ${
              toolbar.view === 'agenda'
                ? 'bg-white text-gray-900 font-medium shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Agenda
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  // Handler for mobile calendar
  const handleMobilePostClick = (post: Post) => {
    setSelectedPost(post)
    setModalOpen(true)
  }

  const handleMobileCreatePost = (dateStr: string) => {
    // Redirect to mobile create post page with prefilled date
    if (typeof window !== 'undefined') {
      window.location.href = `/mobile-create-post?date=${dateStr}&time=09:00`
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats - Compact (Hidden on Mobile) */}
      <div className="hidden md:grid grid-cols-4 gap-3 mb-4 flex-shrink-0">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500 mb-1">Total</div>
          <div className="text-xl font-bold text-gray-900">{events.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500 mb-1">Scheduled</div>
          <div className="text-xl font-bold text-blue-600">
            {events.filter(e => e.resource.status === 'scheduled').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500 mb-1">Published</div>
          <div className="text-xl font-bold text-green-600">
            {events.filter(e => e.resource.status === 'published').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500 mb-1">Failed</div>
          <div className="text-xl font-bold text-red-600">
            {events.filter(e => e.resource.status === 'failed').length}
          </div>
        </div>
      </div>

      {/* Mobile Week View */}
      {isMobile ? (
        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <MobileCalendar
            posts={postsForMobile}
            onPostClick={handleMobilePostClick}
            onCreatePost={handleMobileCreatePost}
          />
        </div>
      ) : (
        /* Desktop Calendar */
        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 overflow-hidden"
             style={{ minHeight: '500px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          view={view}
          onView={(newView) => setView(newView)}
          date={currentDate}
          onNavigate={(date) => setCurrentDate(date)}
          eventPropGetter={eventStyleGetter}
          dayPropGetter={dayPropGetter}
          components={{
            event: CustomEvent,
            toolbar: CustomToolbar,
            dateCellWrapper: CustomDateCell
          }}
          onSelectEvent={(event) => {
            // Find full post data with insights
            let postWithInsights = event.resource
            let postPermalink = undefined
            
            if (event.id.startsWith('threads-')) {
              // Find the post in allThreadsPosts to get insights and permalink
              const threadsPost = allThreadsPosts.find((p: any) => p.id === event.resource.threadsPostId)
              if (threadsPost) {
                postWithInsights = {
                  ...event.resource,
                  insights: threadsPost.insights,
                  mediaUrl: threadsPost.media_url,
                  mediaType: threadsPost.media_type
                } as any
                postPermalink = threadsPost.permalink
              }
            }
            
            setSelectedPost({
              ...postWithInsights,
              permalink: postPermalink
            })
            setModalOpen(true)
          }}
        />
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && username && (
        <PostDetailModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setSelectedPost(null)
          }}
          post={selectedPost}
          username={username}
          profilePictureUrl={profilePictureUrl}
          insights={selectedPost.insights}
          permalink={selectedPost.permalink}
        />
      )}
    </div>
  )
}
