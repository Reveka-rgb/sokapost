'use client'

import { useState, useMemo } from 'react'
import moment from 'moment'
import { FiChevronLeft, FiChevronRight, FiPlus, FiClock, FiCheck } from 'react-icons/fi'

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

interface MobileCalendarProps {
  posts: Post[]
  onPostClick: (post: any) => void
  onCreatePost: (date: string) => void
}

export default function MobileCalendar({ posts, onPostClick, onCreatePost }: MobileCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(moment().startOf('week'))

  // Generate days for current week
  const weekDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(moment(currentWeekStart).add(i, 'days'))
    }
    return days
  }, [currentWeekStart])

  // Group posts by date
  const postsByDate = useMemo(() => {
    const grouped: { [key: string]: Post[] } = {}
    
    posts.forEach(post => {
      const date = post.scheduledAt || post.publishedAt
      if (date) {
        const dateKey = moment(date).format('YYYY-MM-DD')
        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(post)
      }
    })
    
    return grouped
  }, [posts])

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => moment(prev).subtract(1, 'week'))
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => moment(prev).add(1, 'week'))
  }

  const goToToday = () => {
    setCurrentWeekStart(moment().startOf('week'))
  }

  const getStatusIcon = (status: string) => {
    if (status === 'published') {
      return <FiCheck className="w-2.5 h-2.5 text-green-600" />
    } else if (status === 'scheduled') {
      return <FiClock className="w-2.5 h-2.5 text-blue-600" />
    }
    return <FiClock className="w-2.5 h-2.5 text-gray-400" />
  }

  const getPlatformIcon = (platform: string) => {
    if (platform === 'instagram') {
      return (
        <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
          </svg>
        </div>
      )
    }
    return (
      <div className="w-3.5 h-3.5 rounded-full bg-black flex items-center justify-center flex-shrink-0">
        <span className="text-white text-[7px] font-bold">@</span>
      </div>
    )
  }

  const isToday = (date: moment.Moment) => {
    return date.isSame(moment(), 'day')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Week Navigation - Compact */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={goToToday}
            className="px-2 py-1 text-[10px] bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
          >
            Today
          </button>
          
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousWeek}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <FiChevronLeft className="w-3.5 h-3.5 text-gray-700" />
            </button>
            
            <span className="text-[11px] font-semibold text-gray-900 min-w-[100px] text-center">
              {currentWeekStart.format('MMM D')} - {moment(currentWeekStart).add(6, 'days').format('D')}
            </span>
            
            <button
              onClick={goToNextWeek}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <FiChevronRight className="w-3.5 h-3.5 text-gray-700" />
            </button>
          </div>

          <div className="w-[42px]"></div> {/* Spacer for symmetry */}
        </div>

        {/* Day Headers - Horizontal Compact */}
        <div className="grid grid-cols-7 gap-0.5">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center">
              <div className="text-[9px] text-gray-500 uppercase font-medium mb-0.5">
                {day.format('dd')}
              </div>
              <div className={`text-[11px] font-bold rounded-full w-6 h-6 mx-auto flex items-center justify-center ${
                isToday(day)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-900'
              }`}>
                {day.format('D')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Posts List by Day */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {weekDays.map((day) => {
          const dateKey = day.format('YYYY-MM-DD')
          const dayPosts = postsByDate[dateKey] || []
          const isPast = day.isBefore(moment(), 'day')

          return (
            <div key={dateKey} className={`border-b border-gray-200 ${isPast ? 'bg-gray-50' : 'bg-white'}`}>
              {/* Day Header - Compact */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-2 py-1.5 flex items-center justify-between z-10">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-bold ${
                    isToday(day) ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {day.format('ddd, MMM D')}
                  </span>
                  {dayPosts.length > 0 && (
                    <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {dayPosts.length}
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => onCreatePost(dateKey)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  title="Create post"
                >
                  <FiPlus className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </div>

              {/* Posts for this day */}
              <div className="px-2 py-1.5">
                {dayPosts.length === 0 ? (
                  <div className="text-[10px] text-gray-400 text-center py-3">
                    No posts
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {dayPosts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => onPostClick(post)}
                        className="bg-white border border-gray-200 rounded-lg p-2 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer active:bg-gray-50"
                      >
                        <div className="flex items-start gap-1.5">
                          {/* Platform Icon */}
                          <div className="flex-shrink-0 mt-0.5">
                            {getPlatformIcon(post.platform)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[11px] font-bold text-gray-900">
                                {moment(post.scheduledAt || post.publishedAt).format('h:mm A')}
                              </span>
                              <div className="flex-shrink-0">
                                {getStatusIcon(post.status)}
                              </div>
                              <span className={`text-[9px] px-1 py-0.5 rounded uppercase font-bold ${
                                post.status === 'published'
                                  ? 'bg-green-100 text-green-700'
                                  : post.status === 'scheduled'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {post.status}
                              </span>
                            </div>
                            
                            <p className="text-[10px] text-gray-600 line-clamp-2 leading-tight">
                              {post.content || 'Media post'}
                            </p>
                          </div>

                          {/* Thumbnail if has media */}
                          {post.mediaUrl && (
                            <div className="flex-shrink-0">
                              <img
                                src={post.mediaUrl}
                                alt="Post"
                                className="w-10 h-10 rounded object-cover border border-gray-200"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
