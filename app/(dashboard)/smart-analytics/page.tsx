'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

export default function SmartAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showTopPosts, setShowTopPosts] = useState(false)
  const [showBottomPosts, setShowBottomPosts] = useState(false)
  const [rateLimitInfo, setRateLimitInfo] = useState<{remaining: number, reset: number} | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get('/api/smart-analytics')
      
      // Debug logging
      console.log('[Frontend] Top 3 Posts (sorted by total engagement):', response.data.topPosts?.slice(0, 3).map((p: any) => ({
        content: p.content.substring(0, 50),
        views: p.views,
        likes: p.likes,
        replies: p.replies,
        reposts: p.reposts,
        totalEngagement: p.totalEngagement,
        engagementRate: p.engagement + '%'
      })))
      
      setData(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const runAIAnalysis = async () => {
    try {
      setAnalyzing(true)
      setError(null)
      const response = await axios.post('/api/smart-analytics/analyze')
      
      // Extract rate limit info from headers
      const headers = response.headers
      const resetValue = headers['x-ratelimit-reset']
      const remaining = parseInt(headers['x-ratelimit-remaining'] || '0')
      
      console.log('🔍 Response Headers:', {
        limit: headers['x-ratelimit-limit'],
        remaining: headers['x-ratelimit-remaining'],
        reset: resetValue,
        resetParsed: parseInt(resetValue || '0')
      })
      
      setRateLimitInfo({
        remaining: remaining,
        reset: parseInt(resetValue || '0')
      })
      
      setData(response.data)
    } catch (err: any) {
      // Extract rate limit info even on error
      if (err.response?.headers) {
        const headers = err.response.headers
        const resetValue = headers['x-ratelimit-reset']
        
        console.log('🔍 Error Response Headers:', {
          limit: headers['x-ratelimit-limit'],
          remaining: headers['x-ratelimit-remaining'],
          reset: resetValue,
          resetParsed: parseInt(resetValue || '0')
        })
        
        setRateLimitInfo({
          remaining: parseInt(headers['x-ratelimit-remaining'] || '0'),
          reset: parseInt(resetValue || '0')
        })
      }
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to run AI analysis')
    } finally {
      setAnalyzing(false)
    }
  }

  // Calculate time until rate limit reset
  const getTimeUntilReset = () => {
    if (!rateLimitInfo || rateLimitInfo.remaining > 0) return null
    
    // Get current time in seconds
    const now = Math.floor(Date.now() / 1000)
    
    // Reset time from Redis is already in seconds (Unix timestamp)
    // But we need to ensure it's valid
    let resetTime = rateLimitInfo.reset
    
    // If reset time is in milliseconds (check if value is too large), convert to seconds
    if (resetTime > 9999999999) {
      resetTime = Math.floor(resetTime / 1000)
    }
    
    const secondsLeft = resetTime - now
    
    // Debug log (remove in production)
    console.log('Rate Limit Debug:', {
      now,
      resetTime,
      secondsLeft,
      rateLimitInfo
    })
    
    // If time already passed or invalid
    if (secondsLeft <= 0 || secondsLeft > 86400) {
      // If more than 24 hours, something is wrong - refresh page
      if (secondsLeft > 86400) {
        console.warn('Rate limit reset time is invalid:', secondsLeft, 'seconds')
      }
      return null
    }
    
    const hoursLeft = Math.floor(secondsLeft / 3600)
    const minutesLeft = Math.floor((secondsLeft % 3600) / 60)
    
    if (hoursLeft > 0) {
      return `${hoursLeft} jam ${minutesLeft} menit`
    }
    return `${minutesLeft} menit`
  }

  const isRateLimited = !!(rateLimitInfo && rateLimitInfo.remaining === 0 && getTimeUntilReset())

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-800"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">AI Insight</h1>
            <p className="text-xs text-gray-500 mt-0.5">Analisa performa 30 hari terakhir dengan AI</p>
            
            {/* Rate Limit Info */}
            {isRateLimited && (
              <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                ⏱️ AI Insight tersedia lagi dalam <strong>{getTimeUntilReset()}</strong>
              </div>
            )}
          </div>
          
          <button
            onClick={runAIAnalysis}
            disabled={analyzing || isRateLimited}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {analyzing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Analyzing...
              </span>
            ) : isRateLimited ? (
              '🔒 Limit Reached'
            ) : data?.aiRecommendations ? (
              '🔄 Refresh AI'
            ) : (
              '✨ Generate AI Insight'
            )}
          </button>
        </div>
      </div>

      {/* Overview Cards - Full Width */}
      <div className="mb-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
              <div className="bg-white rounded border border-gray-200 p-3">
                <p className="text-[10px] text-gray-500 mb-1">Followers</p>
                <p className="text-xl font-bold text-gray-900">{data?.overview?.followersCount?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-white rounded border border-gray-200 p-3">
                <p className="text-[10px] text-gray-500 mb-1">Posts</p>
                <p className="text-xl font-bold text-gray-900">{data?.overview?.totalPosts || 0}</p>
              </div>
              <div className="bg-white rounded border border-gray-200 p-3">
                <p className="text-[10px] text-gray-500 mb-1">Views</p>
                <p className="text-xl font-bold text-gray-900">{data?.overview?.totalViews?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-white rounded border border-gray-200 p-3">
                <p className="text-[10px] text-gray-500 mb-1">Likes</p>
                <p className="text-xl font-bold text-gray-900">{data?.overview?.totalLikes?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-white rounded border border-gray-200 p-3">
                <p className="text-[10px] text-gray-500 mb-1">Replies</p>
                <p className="text-xl font-bold text-gray-900">{data?.overview?.totalReplies?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-white rounded border border-gray-200 p-3">
                <p className="text-[10px] text-gray-500 mb-1">Reposts</p>
                <p className="text-xl font-bold text-gray-900">{data?.overview?.totalReposts?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-white rounded border border-gray-200 p-3">
                <p className="text-[10px] text-gray-500 mb-1">Avg Engagement</p>
                <p className="text-xl font-bold text-green-600">
                  {data?.overview?.avgEngagement?.toFixed(1) || 0}%
                </p>
              </div>
        </div>
      </div>

      {/* 2 Column Layout - AI & Posts */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
          
          {/* Left Column - AI Recommendations */}
          <div className="space-y-3 overflow-y-auto">
            
            {/* AI Summary or CTA */}
            {data?.aiRecommendations ? (
              <div className="bg-gray-900 rounded border border-gray-800 p-4">
                <h3 className="text-sm font-semibold text-white mb-2">✨ AI Summary</h3>
                <p className="text-sm text-gray-100 leading-relaxed">
                  {data.aiRecommendations.summary}
                </p>
              </div>
            ) : !analyzing && (
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded border-2 border-dashed border-purple-300 p-6 text-center">
                <div className="text-4xl mb-3">🤖✨</div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  AI-Powered Insight Ready!
                </h3>
                <p className="text-xs text-gray-600 mb-4">
                  Dapatkan rekomendasi waktu posting terbaik, ide konten, dan tips untuk meningkatkan engagement Anda
                </p>
                <button
                  onClick={runAIAnalysis}
                  disabled={isRateLimited}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isRateLimited ? `🔒 Tersedia dalam ${getTimeUntilReset()}` : '✨ Generate AI Insight'}
                </button>
              </div>
            )}

            {/* AI Recommendations Grid */}
            {data?.aiRecommendations && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* Best Times */}
                {data.aiRecommendations.bestTimes?.length > 0 && (
                  <div className="bg-white rounded border border-green-600 p-3">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">⏰ Waktu Terbaik</h3>
                    <div className="space-y-1">
                      {data.aiRecommendations.bestTimes.map((time: string, i: number) => (
                        <p key={i} className="text-sm text-gray-700">• {time}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Tips */}
                {data.aiRecommendations.contentTips?.length > 0 && (
                  <div className="bg-white rounded border border-green-600 p-3">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">⚡ Tips Konten</h3>
                    <div className="space-y-1">
                      {data.aiRecommendations.contentTips.map((tip: string, i: number) => (
                        <p key={i} className="text-sm text-gray-700">• {tip}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Ideas */}
                {data.aiRecommendations.contentIdeas?.length > 0 && (
                  <div className="bg-white rounded border border-green-600 p-3">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">💡 Ide Konten</h3>
                    <div className="space-y-1">
                      {data.aiRecommendations.contentIdeas.map((idea: string, i: number) => (
                        <p key={i} className="text-sm text-gray-700">• {idea}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improvements */}
                {data.aiRecommendations.improvements?.length > 0 && (
                  <div className="bg-white rounded border border-red-600 p-3">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">🔴 Area Improvement</h3>
                    <div className="space-y-1">
                      {data.aiRecommendations.improvements.map((imp: string, i: number) => (
                        <p key={i} className="text-sm text-gray-700">• {imp}</p>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Loading State for AI */}
            {analyzing && (
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded border border-purple-200 p-6 text-center">
                <div className="relative w-12 h-12 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-200"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">🤖 AI sedang menganalisa...</p>
                <p className="text-xs text-gray-600">Memproses data performa dan menghasilkan insight</p>
              </div>
            )}

          </div>

          {/* Right Column (1/3) - Top & Bottom Posts */}
          <div className="space-y-3 overflow-y-auto">
            
            {/* Top Posts List - Collapsible */}
            <div className="bg-white rounded border border-gray-200 p-4">
              <button
                onClick={() => setShowTopPosts(!showTopPosts)}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 hover:text-green-600 transition-colors"
              >
                <span>Top 10 Posts</span>
                <span className="text-lg">{showTopPosts ? '−' : '+'}</span>
              </button>
              
              {showTopPosts && (
                <div className="space-y-3 mt-3 pt-3 border-t border-gray-200">
                  {data?.topPosts?.slice(0, 10).map((post: any, index: number) => (
                    <div key={post.id} className="border-l-2 border-green-600 pl-3 py-2">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-green-600">#{index + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-green-600">{post.totalEngagement}</span>
                          <span className="text-xs text-gray-500">({post.engagement.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-900 mb-2 line-clamp-3">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500">
                        <span>👁️ {post.views.toLocaleString()}</span>
                        <span>❤️ {post.likes}</span>
                        <span>💬 {post.replies}</span>
                        <span>🔄 {post.reposts}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Posts List - Collapsible */}
            <div className="bg-white rounded border border-gray-200 p-4">
              <button
                onClick={() => setShowBottomPosts(!showBottomPosts)}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 hover:text-red-600 transition-colors"
              >
                <span>Performa Terburuk</span>
                <span className="text-lg">{showBottomPosts ? '−' : '+'}</span>
              </button>
              
              {showBottomPosts && (
                <div className="space-y-3 mt-3 pt-3 border-t border-gray-200">
                  {data?.topPosts
                    ?.filter((post: any) => post.views > 0)
                    .slice(-10)
                    .reverse()
                    .map((post: any, index: number) => (
                      <div key={post.id} className="border-l-2 border-red-600 pl-3 py-2">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs font-semibold text-red-600">#{index + 1}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-red-600">{post.totalEngagement}</span>
                            <span className="text-xs text-gray-500">({post.engagement.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-900 mb-2 line-clamp-3">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500">
                          <span>👁️ {post.views.toLocaleString()}</span>
                          <span>❤️ {post.likes}</span>
                          <span>💬 {post.replies}</span>
                          <span>🔄 {post.reposts}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
