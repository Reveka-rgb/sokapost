'use client'

import { FiX, FiHeart, FiMessageCircle, FiEye, FiRepeat, FiExternalLink, FiMaximize2, FiRefreshCw, FiShare2 } from 'react-icons/fi'
import { MdVerified } from 'react-icons/md'

interface PostDetailModalProps {
  isOpen: boolean
  onClose: () => void
  post: {
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
  username?: string
  profilePictureUrl?: string
  insights?: {
    views?: number
    likes?: number
    replies?: number
    reposts?: number
    quotes?: number
  }
  permalink?: string
}

export default function PostDetailModal({ 
  isOpen, 
  onClose, 
  post, 
  username,
  profilePictureUrl,
  insights,
  permalink 
}: PostDetailModalProps) {
  if (!isOpen) return null

  const formatNumber = (num?: number) => {
    if (!num) return '0'
    return num.toLocaleString()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    })
  }

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return ''
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return `Refreshed ${diffMins} minutes ago`
    }
    if (diffHours < 24) {
      return `Refreshed ${diffHours} hours ago`
    }
    const diffDays = Math.floor(diffHours / 24)
    return `Refreshed ${diffDays} days ago`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 modal-backdrop" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{formatDate(post.publishedAt || post.scheduledAt)}</span>
            {post.platform === 'threads' && (
              <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full">
                Custom
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
              <FiMaximize2 className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            >
              <FiX className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Post Preview */}
        <div className="p-5">
          {/* User Info */}
          <div className="flex items-start gap-3 mb-4">
            {/* Profile Picture */}
            <div className="relative">
              {profilePictureUrl ? (
                <img 
                  src={profilePictureUrl} 
                  alt={username || 'User'}
                  className="w-12 h-12 rounded-full object-cover shadow-md"
                  onError={(e) => {
                    // Fallback to gradient if image fails to load
                    const target = e.currentTarget
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      const fallback = document.createElement('div')
                      fallback.className = 'w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md'
                      fallback.textContent = username ? username[0].toUpperCase() : 'U'
                      parent.insertBefore(fallback, parent.firstChild)
                    }
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {username ? username[0].toUpperCase() : 'U'}
                </div>
              )}
              {/* Threads Logo Badge */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center border-2 border-white">
                <span className="text-white text-xs">@</span>
              </div>
            </div>

            {/* Username and Verified */}
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-900">{username || 'User'}</span>
                <MdVerified className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-sm text-gray-500">@{username || 'user'}</div>
            </div>
          </div>

          {/* Post Content */}
          {post.content && (
            <div className="mb-4">
              <p className="text-gray-900 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </div>
          )}

          {/* Media Preview */}
          {post.mediaUrl && post.mediaType && (
            <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 bg-gray-900">
              {post.mediaType === 'IMAGE' && (
                <img 
                  src={post.mediaUrl} 
                  alt="Post media" 
                  className="w-full h-auto object-contain max-h-96"
                  loading="lazy"
                  onError={(e) => {
                    // Show placeholder if image fails to load
                    const target = e.currentTarget
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-400"><span>📷 Image unavailable</span></div>'
                    }
                  }}
                />
              )}
              {post.mediaType === 'VIDEO' && (
                <video 
                  src={post.mediaUrl} 
                  controls 
                  className="w-full h-auto object-contain max-h-96"
                  preload="metadata"
                  onError={(e) => {
                    // Show placeholder if video fails to load
                    const target = e.currentTarget
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-400"><span>🎥 Video unavailable</span></div>'
                    }
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              )}
              {post.mediaType === 'CAROUSEL_ALBUM' && (
                <div className="relative">
                  <img 
                    src={post.mediaUrl} 
                    alt="Post media" 
                    className="w-full h-auto object-contain max-h-96"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-400"><span>📷 Album unavailable</span></div>'
                      }
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                    📷 Carousel Album
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons (like Threads) */}
          <div className="flex items-center gap-1 py-2 border-b border-gray-200 mb-4">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <FiShare2 className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Refresh Status */}
          {post.status === 'published' && (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-4">
              <FiRefreshCw className="w-3 h-3" />
              <span>{getTimeAgo(post.publishedAt)}</span>
            </div>
          )}

          {/* Engagement Stats */}
          {post.status === 'published' && insights && (
            <div className="grid grid-cols-5 gap-2 mb-5 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <FiHeart className="w-4 h-4 text-gray-500" />
                </div>
                <div className="text-sm font-semibold text-gray-900">{formatNumber(insights.likes)}</div>
                <div className="text-xs text-gray-500">Likes</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <FiMessageCircle className="w-4 h-4 text-gray-500" />
                </div>
                <div className="text-sm font-semibold text-gray-900">{formatNumber(insights.replies)}</div>
                <div className="text-xs text-gray-500">Replies</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <FiEye className="w-4 h-4 text-gray-500" />
                </div>
                <div className="text-sm font-semibold text-gray-900">{formatNumber(insights.views)}</div>
                <div className="text-xs text-gray-500">Views</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <FiRepeat className="w-4 h-4 text-gray-500" />
                </div>
                <div className="text-sm font-semibold text-gray-900">{formatNumber(insights.reposts)}</div>
                <div className="text-xs text-gray-500">Reposts</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <FiShare2 className="w-4 h-4 text-gray-500" />
                </div>
                <div className="text-sm font-semibold text-gray-900">{formatNumber(insights.quotes)}</div>
                <div className="text-xs text-gray-500">Quotes</div>
              </div>
            </div>
          )}

          {/* Status Badge (for non-published) */}
          {post.status !== 'published' && (
            <div className="mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                post.status === 'scheduled'
                  ? 'bg-blue-100 text-blue-700'
                  : post.status === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {post.status === 'scheduled' && '🕐'}
                {post.status === 'failed' && '✗'}
                {' '}
                {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {permalink && post.status === 'published' && (
              <a
                href={permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md font-medium text-sm"
              >
                <FiExternalLink className="w-4 h-4" />
                View Post
              </a>
            )}
            <button className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-gray-700">⋯</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
