'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/lib/auth-client'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiMoreVertical, FiEdit2, FiTrash2, FiX, FiImage } from 'react-icons/fi'

interface Post {
  id: string
  content: string
  status: string
  platform: string
  topic: string | null
  location: string | null
  createdAt: string
  scheduledAt: string | null
  publishedAt: string | null
  errorMessage: string | null
  mediaUrls: string | null
}

export default function PostsPage() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await axios.get('/api/posts')
      setPosts(response.data.posts)
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePublishNow = async (postId: string) => {
    if (!confirm('Publish this post now?')) return

    try {
      setPublishing(postId)
      setMenuOpen(null)
      const response = await axios.post(`/api/posts/${postId}/publish`)
      toast.success('Post published successfully!')
      fetchPosts()
    } catch (error: any) {
      console.error('Publish error:', error)
      toast.error(error.response?.data?.message || 'Failed to publish post')
    } finally {
      setPublishing(null)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post? This action cannot be undone.')) return

    try {
      setDeleting(postId)
      setMenuOpen(null)
      await axios.delete(`/api/posts/${postId}`)
      toast.success('Post deleted successfully!')
      fetchPosts()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.response?.data?.message || 'Failed to delete post')
    } finally {
      setDeleting(null)
    }
  }

  const handleCancelSchedule = async (postId: string) => {
    if (!confirm('Cancel this scheduled post?')) return

    try {
      setMenuOpen(null)
      await axios.patch(`/api/posts/${postId}`, { status: 'draft' })
      toast.success('Post moved to draft!')
      fetchPosts()
    } catch (error: any) {
      console.error('Cancel error:', error)
      toast.error(error.response?.data?.message || 'Failed to cancel post')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading posts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 md:mb-6 flex-shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Posts</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">Manage all your posts</p>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12 text-center">
          <p className="text-sm md:text-base text-gray-500 mb-2 md:mb-4">No posts yet</p>
          <p className="text-xs md:text-sm text-gray-400">Click "New" button to create your first post</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3 pb-4">
          {posts.map((post) => {
            const mediaUrls = post.mediaUrls ? JSON.parse(post.mediaUrls) : []
            const firstImage = mediaUrls[0]
            
            return (
              <div
                key={post.id}
                className="bg-white rounded-lg md:rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all group relative"
              >
                {/* Image Thumbnail */}
                {firstImage && (
                  <div className="relative w-full h-28 md:h-36 bg-gray-100">
                    <img
                      src={firstImage}
                      alt="Post"
                      className="w-full h-full object-cover"
                    />
                    {mediaUrls.length > 1 && (
                      <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 bg-black bg-opacity-70 text-white text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded flex items-center gap-0.5 md:gap-1">
                        <FiImage className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        {mediaUrls.length}
                      </div>
                    )}
                  </div>
                )}

                {/* No Image Placeholder */}
                {!firstImage && (
                  <div className="w-full h-28 md:h-36 bg-gray-50 flex items-center justify-center">
                    <FiImage className="w-8 h-8 md:w-10 md:h-10 text-gray-300" />
                  </div>
                )}

                {/* Content */}
                <div className="p-2 md:p-3">
                  {/* Status & Platform Badges */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                      post.status === 'published' 
                        ? 'bg-green-100 text-green-700'
                        : post.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-700'
                        : post.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {post.status}
                    </span>
                    
                    {/* Platform Badge */}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 ${
                      post.platform === 'instagram'
                        ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700'
                        : 'bg-black text-white'
                    }`}>
                      {post.platform === 'instagram' ? (
                        <>
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                          </svg>
                          IG
                        </>
                      ) : (
                        <>
                          <span className="font-bold">@</span>
                          TH
                        </>
                      )}
                    </span>
                  </div>

                  {/* Post Content */}
                  <p className="text-xs text-gray-800 line-clamp-2 mb-2 min-h-[32px] leading-snug">
                    {post.content}
                  </p>

                  {/* Topic & Location */}
                  {(post.topic || post.location) && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {post.topic && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">
                          # {post.topic}
                        </span>
                      )}
                      {post.location && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-medium">
                          📍 {post.location}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Date */}
                  <div className="text-[10px] text-gray-500 mb-2">
                    {post.scheduledAt && (
                      <p className="font-medium text-blue-600">
                        📅 {new Date(post.scheduledAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric'
                        })} • {new Date(post.scheduledAt).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </p>
                    )}
                    {post.publishedAt && (
                      <p className="font-medium text-green-600">
                        ✅ {new Date(post.publishedAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric'
                        })} • {new Date(post.publishedAt).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </p>
                    )}
                    {!post.scheduledAt && !post.publishedAt && (
                      <p className="text-gray-500">
                        {new Date(post.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric'
                        })} • {new Date(post.createdAt).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </p>
                    )}
                  </div>

                  {/* Error Message */}
                  {post.errorMessage && (
                    <div className="mb-2 p-1.5 bg-red-50 border border-red-200 rounded text-[10px] text-red-700">
                      {post.errorMessage}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {(post.status === 'draft' || post.status === 'scheduled' || post.status === 'failed') && (
                      <button
                        onClick={() => handlePublishNow(post.id)}
                        disabled={publishing === post.id || deleting === post.id}
                        className="flex-1 px-2.5 py-1.5 bg-black text-white text-[10px] font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {publishing === post.id ? 'Publishing...' : 'Publish Now'}
                      </button>
                    )}
                    
                    {post.status === 'scheduled' && (
                      <button
                        onClick={() => handleCancelSchedule(post.id)}
                        disabled={publishing === post.id || deleting === post.id}
                        className="p-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={publishing === post.id || deleting === post.id}
                      className="p-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {deleting === post.id ? '...' : <FiTrash2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      )}
    </div>
  )
}
