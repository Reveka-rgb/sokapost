'use client'

import { FiBarChart2, FiTrendingUp, FiHeart, FiMessageCircle, FiRepeat, FiExternalLink, FiEye } from 'react-icons/fi'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'

interface InsightsData {
  connected: boolean
  username?: string
  summary: {
    totalPosts: number
    totalViews: number
    totalLikes: number
    totalReplies: number
    totalReposts: number
    totalQuotes: number
    totalEngagement: number
    followersCount: number
  }
  posts: Array<{
    id: string
    text: string
    timestamp: string
    permalink: string
    media_url?: string
    media_type?: string
    insights: {
      views?: number
      likes?: number
      replies?: number
      reposts?: number
      quotes?: number
    }
  }>
}

export default function InsightsPage() {
  // Fetch insights dengan React Query caching
  const { 
    data: insights, 
    isLoading: loading, 
    error: queryError,
    refetch,
    isFetching
  } = useQuery<InsightsData>({
    queryKey: ['threads-insights'],
    queryFn: async () => {
      const response = await axios.get('/api/threads/insights')
      
      // console.log('Insights response:', {
      //   totalPosts: response.data.posts?.length,
      //   postsWithMedia: response.data.posts?.filter((p: any) => p.media_url).length
      // })
      
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - insights tidak berubah cepat
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 1,
    refetchOnWindowFocus: true,
  })

  const error = queryError ? (queryError as any).response?.data?.error || 'Failed to load insights' : null

  const handleRefresh = async () => {
    await refetch()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading insights...</p>
        </div>
      </div>
    )
  }

  if (error || !insights?.connected) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Insights</h1>
          <p className="text-sm text-gray-600 mt-1">Track your Threads performance</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 md:p-6 text-center">
          <FiBarChart2 className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-yellow-600" />
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
            {error || 'No Threads Account Connected'}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Connect your Threads account to see insights
          </p>
          <Link
            href="/connections"
            className="inline-block px-4 md:px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Connections
          </Link>
        </div>
      </div>
    )
  }

  const { summary, posts } = insights

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Insights</h1>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium">@{insights.username}</span>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center sm:w-auto"
        >
          {isFetching ? (
            <>
              <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Refreshing...</span>
            </>
          ) : (
            <span className="text-sm">Refresh</span>
          )}
        </button>
      </div>

      {/* Stats Cards - Compact Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 md:mb-6 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <FiBarChart2 className="text-black w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div>
              <div className="text-lg md:text-2xl font-bold text-black">
                {summary.totalPosts.toLocaleString()}
              </div>
              <div className="text-[10px] md:text-xs text-gray-600">Posts</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <FiEye className="text-black w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div>
              <div className="text-lg md:text-2xl font-bold text-black">
                {summary.totalViews.toLocaleString()}
              </div>
              <div className="text-[10px] md:text-xs text-gray-600">Views</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <FiHeart className="text-black w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div>
              <div className="text-lg md:text-2xl font-bold text-black">
                {summary.totalLikes.toLocaleString()}
              </div>
              <div className="text-[10px] md:text-xs text-gray-600">Likes</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <FiMessageCircle className="text-black w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div>
              <div className="text-lg md:text-2xl font-bold text-black">
                {summary.totalEngagement.toLocaleString()}
              </div>
              <div className="text-[10px] md:text-xs text-gray-600">Engagement</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Posts - Scrollable */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-3 md:p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-sm md:text-base font-semibold text-gray-900">
            Recent Posts
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {posts.length} posts
          </p>
        </div>
        
        {posts.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-gray-500">
            <FiBarChart2 className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-50" />
            <p>No posts found</p>
            <p className="text-sm mt-1">Create your first post to see insights</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
            {posts.map((post) => (
              <div key={post.id} className="p-3 md:p-4 hover:bg-gray-50 transition-colors">
                <div className="flex gap-2 md:gap-3">
                  {/* Thumbnail - Left */}
                  {post.media_url ? (
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden bg-gray-100 relative border border-gray-200">
                        <Image
                          src={post.media_url}
                          alt="Post media"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 48px, 64px"
                          unoptimized
                          onError={(e) => {
                            console.error('Image failed to load:', post.media_url)
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-lg bg-black flex items-center justify-center">
                      <FiBarChart2 className="w-4 h-4 md:w-6 md:h-6 text-white opacity-90" />
                    </div>
                  )}

                  {/* Content - Right */}
                  <div className="flex-1 min-w-0">
                    {/* Text & Link */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-xs md:text-sm text-gray-900 line-clamp-2 flex-1">
                        {post.text || 'Media post'}
                      </p>
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                        title="View on Threads"
                      >
                        <FiExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </a>
                    </div>

                    {/* Stats - Compact */}
                    <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs text-gray-600 flex-wrap">
                      <div className="flex items-center gap-1">
                        <FiEye className="w-3 h-3" />
                        <span>{(post.insights.views || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FiHeart className="w-3 h-3" />
                        <span>{(post.insights.likes || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FiMessageCircle className="w-3 h-3" />
                        <span>{(post.insights.replies || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FiRepeat className="w-3 h-3" />
                        <span>{(post.insights.reposts || 0).toLocaleString()}</span>
                      </div>
                      <span className="hidden sm:inline text-gray-400">•</span>
                      <span className="hidden sm:inline text-gray-500">
                        {new Date(post.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
