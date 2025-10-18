'use client'

import { useState, useEffect } from 'react'
import { FiMessageSquare, FiClock, FiRefreshCw, FiSend, FiZap, FiX, FiExternalLink } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface ThreadsComment {
  id: string
  text: string
  username: string
  timestamp: string
  permalink?: string
  postId: string
  postText?: string
  postPermalink?: string
  postMediaType?: string
  postMediaUrl?: string
  hasReplied?: boolean // Already replied on Threads
}

interface PostWithStats {
  id: string
  text: string
  timestamp: string
  permalink?: string
  mediaType?: string
  mediaUrl?: string
  totalComments: number
  unrepliedCount: number
  repliedCount: number
}

export default function ThreadsCommentsPage() {
  const [comments, setComments] = useState<ThreadsComment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [repliedCommentIds, setRepliedCommentIds] = useState<Set<string>>(new Set())
  
  // View mode
  const [viewMode, setViewMode] = useState<'allComments' | 'byPosts'>('allComments')
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  
  // Tab filter
  const [activeTab, setActiveTab] = useState<'all' | 'unreplied' | 'replied'>('all')

  // Reply Modal
  const [replyModal, setReplyModal] = useState<{
    open: boolean
    comment: ThreadsComment | null
    type: 'manual' | 'ai'
  }>({ open: false, comment: null, type: 'manual' })

  const [manualReplyText, setManualReplyText] = useState('')
  const [aiReplyText, setAiReplyText] = useState('')
  const [generatingAI, setGeneratingAI] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)

  // Batch selection
  const [selectedComments, setSelectedComments] = useState<string[]>([])
  const [batchModal, setBatchModal] = useState<{
    open: boolean
    type: 'manual' | 'ai'
  }>({ open: false, type: 'manual' })
  const [batchReplyText, setBatchReplyText] = useState('')
  const [batchProgress, setBatchProgress] = useState<{
    total: number
    current: number
    success: number
    failed: number
  }>({ total: 0, current: 0, success: 0, failed: 0 })
  const [sendingBatch, setSendingBatch] = useState(false)
  
  // AI Preview for batch
  const [generatingBatchAI, setGeneratingBatchAI] = useState(false)
  const [batchAIReplies, setBatchAIReplies] = useState<Record<string, string>>({}) // commentId -> reply text
  
  // Delay settings for batch
  const [batchDelay, setBatchDelay] = useState(2) // seconds
  const [batchDelayUnit, setBatchDelayUnit] = useState<'seconds' | 'minutes'>('seconds')

  useEffect(() => {
    fetchComments()
  }, [])

  const fetchComments = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await axios.get('/api/threads/comments')
      const fetchedComments = response.data.comments || []
      
      // Merge with local replied state
      const commentsWithStatus = fetchedComments.map((c: ThreadsComment) => ({
        ...c,
        // Mark as replied if either: 1) hasReplied from Threads, or 2) in local repliedCommentIds
        hasReplied: c.hasReplied || repliedCommentIds.has(c.id)
      }))
      
      setComments(commentsWithStatus)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load comments')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }



  const openManualReply = (comment: ThreadsComment) => {
    setReplyModal({ open: true, comment, type: 'manual' })
    setManualReplyText('')
  }

  const openAIReply = (comment: ThreadsComment) => {
    setReplyModal({ open: true, comment, type: 'ai' })
    setAiReplyText('')
  }

  const closeReplyModal = () => {
    setReplyModal({ open: false, comment: null, type: 'manual' })
    setManualReplyText('')
    setAiReplyText('')
  }

  const generateAIReply = async () => {
    if (!replyModal.comment) return

    try {
      setGeneratingAI(true)
      const response = await axios.post('/api/auto-reply/generate', {
        messageText: replyModal.comment.text,
        fromUsername: replyModal.comment.username
      })
      setAiReplyText(response.data.replyText)
      toast.success('AI reply generated!')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate AI reply')
    } finally {
      setGeneratingAI(false)
    }
  }

  const sendReply = async () => {
    if (!replyModal.comment) return

    const replyText = replyModal.type === 'manual' ? manualReplyText : aiReplyText

    if (!replyText.trim()) {
      toast.error('Please enter a reply')
      return
    }

    try {
      setSendingReply(true)
      await axios.post('/api/threads/comments/reply', {
        commentId: replyModal.comment.id,
        replyText: replyText.trim()
      })

      // Mark as replied
      setRepliedCommentIds(prev => new Set(prev).add(replyModal.comment!.id))

      toast.success('Reply sent successfully!')
      closeReplyModal()
      fetchComments(true) // Refresh
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send reply')
    } finally {
      setSendingReply(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateText = (text: string, maxLength: number = 60) => {
    if (!text) return '(No text)'
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const getPostsWithStats = (): PostWithStats[] => {
    const postsMap = new Map<string, PostWithStats>()
    
    comments.forEach(comment => {
      if (!comment.postId) return
      
      if (!postsMap.has(comment.postId)) {
        postsMap.set(comment.postId, {
          id: comment.postId,
          text: comment.postText || '(No text)',
          timestamp: comment.timestamp,
          permalink: comment.postPermalink,
          mediaType: comment.postMediaType,
          mediaUrl: comment.postMediaUrl,
          totalComments: 0,
          unrepliedCount: 0,
          repliedCount: 0
        })
      }
      
      const post = postsMap.get(comment.postId)!
      post.totalComments++
      if (comment.hasReplied) {
        post.repliedCount++
      } else {
        post.unrepliedCount++
      }
    })
    
    // Sort by newest first
    return Array.from(postsMap.values()).sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
  }

  const getFilteredComments = () => {
    let filtered = comments
    
    // Filter by selected post if in byPosts view
    if (selectedPostId) {
      filtered = filtered.filter(c => c.postId === selectedPostId)
    }
    
    // Filter by reply status
    switch (activeTab) {
      case 'unreplied':
        return filtered.filter(c => !c.hasReplied)
      case 'replied':
        return filtered.filter(c => c.hasReplied)
      default:
        return filtered
    }
  }

  const postsWithStats = getPostsWithStats()
  const filteredComments = getFilteredComments()
  
  const handlePostClick = (postId: string) => {
    setSelectedPostId(postId)
    setViewMode('allComments')
    setActiveTab('all')
  }
  
  const handleBackToPosts = () => {
    setSelectedPostId(null)
    setViewMode('byPosts')
  }

  const toggleSelectComment = (commentId: string) => {
    setSelectedComments(prev =>
      prev.includes(commentId)
        ? prev.filter(id => id !== commentId)
        : [...prev, commentId]
    )
  }

  const selectAllComments = () => {
    setSelectedComments(comments.map(c => c.id))
  }

  const deselectAllComments = () => {
    setSelectedComments([])
  }

  const openBatchManualReply = () => {
    setBatchModal({ open: true, type: 'manual' })
    setBatchReplyText('')
  }

  const openBatchAIReply = () => {
    setBatchModal({ open: true, type: 'ai' })
  }

  const closeBatchModal = () => {
    setBatchModal({ open: false, type: 'manual' })
    setBatchReplyText('')
    setBatchAIReplies({})
    setBatchProgress({ total: 0, current: 0, success: 0, failed: 0 })
  }

  const generateBatchAIReplies = async () => {
    if (selectedComments.length === 0) return

    const selectedCommentsData = comments.filter(c => selectedComments.includes(c.id))

    try {
      setGeneratingBatchAI(true)
      const replies: Record<string, string> = {}

      for (const comment of selectedCommentsData) {
        try {
          const response = await axios.post('/api/auto-reply/generate', {
            messageText: comment.text,
            fromUsername: comment.username
          })
          replies[comment.id] = response.data.replyText
        } catch (error) {
          console.error(`Failed to generate for ${comment.id}:`, error)
          replies[comment.id] = '' // Empty = failed
        }
      }

      setBatchAIReplies(replies)
      toast.success('AI replies generated! Review and edit before sending')
    } catch (error) {
      toast.error('Failed to generate AI replies')
    } finally {
      setGeneratingBatchAI(false)
    }
  }

  const updateBatchAIReply = (commentId: string, newText: string) => {
    setBatchAIReplies(prev => ({
      ...prev,
      [commentId]: newText
    }))
  }

  const sendBatchReply = async () => {
    if (selectedComments.length === 0) {
      toast.error('No comments selected')
      return
    }

    // For AI mode, check if replies are generated
    if (batchModal.type === 'ai' && Object.keys(batchAIReplies).length === 0) {
      toast.error('Please generate AI replies first')
      return
    }

    const selectedCommentsData = comments.filter(c => selectedComments.includes(c.id))

    try {
      setSendingBatch(true)
      setBatchProgress({
        total: selectedComments.length,
        current: 0,
        success: 0,
        failed: 0
      })

      let successCount = 0
      let failedCount = 0

      for (let i = 0; i < selectedCommentsData.length; i++) {
        const comment = selectedCommentsData[i]
        
        setBatchProgress(prev => ({ ...prev, current: i + 1 }))

        try {
          let replyText = ''

          if (batchModal.type === 'manual') {
            // Use same reply for all
            replyText = batchReplyText.trim()
          } else {
            // Use pre-generated AI reply
            replyText = batchAIReplies[comment.id]?.trim() || ''
          }

          if (!replyText) {
            failedCount++
            setBatchProgress(prev => ({ ...prev, failed: prev.failed + 1 }))
            continue
          }

          // Send reply
          await axios.post('/api/threads/comments/reply', {
            commentId: comment.id,
            replyText
          })

          successCount++
          setBatchProgress(prev => ({ ...prev, success: prev.success + 1 }))
          
          // Mark as replied
          setRepliedCommentIds(prev => new Set(prev).add(comment.id))

          // Custom delay to avoid rate limiting
          const delayMs = batchDelayUnit === 'minutes' 
            ? batchDelay * 60 * 1000 
            : batchDelay * 1000
          await new Promise(resolve => setTimeout(resolve, delayMs))
        } catch (error) {
          console.error(`Failed to reply to ${comment.id}:`, error)
          failedCount++
          setBatchProgress(prev => ({ ...prev, failed: prev.failed + 1 }))
        }
      }

      toast.success(`Batch reply completed! ${successCount} sent, ${failedCount} failed`)
      
      // Refresh comments and clear selection
      setTimeout(() => {
        fetchComments(true)
        setSelectedComments([])
        closeBatchModal()
      }, 1500)
    } catch (error: any) {
      toast.error('Batch reply failed')
    } finally {
      setSendingBatch(false)
    }
  }

  return (
    <div className="h-full flex flex-col pb-8 bg-gray-50">
      {/* Header */}
      <div className="mb-4 flex-shrink-0 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Threads Comments Management</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              Manage and reply to comments on your Threads posts
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {comments.length} total • {comments.filter(c => c.hasReplied).length} replied
              {selectedComments.length > 0 && (
                <span className="ml-2 text-blue-600 font-medium">
                  • {selectedComments.length} selected
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {comments.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={selectAllComments}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Select All
                </button>
                {selectedComments.length > 0 && (
                  <>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAllComments}
                      className="text-gray-600 hover:underline font-medium"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            )}
            <button
              onClick={() => fetchComments(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => {
              setViewMode('allComments')
              setSelectedPostId(null)
            }}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'allComments'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Comments ({comments.length})
          </button>
          <button
            onClick={() => setViewMode('byPosts')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'byPosts'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            By Posts ({postsWithStats.length})
          </button>
        </div>

        {/* Filter Tabs - Only show in All Comments view */}
        {viewMode === 'allComments' && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All ({selectedPostId ? filteredComments.length : comments.length})
            </button>
            <button
              onClick={() => setActiveTab('unreplied')}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'unreplied'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Unreplied ({selectedPostId ? filteredComments.filter(c => !c.hasReplied).length : comments.filter(c => !c.hasReplied).length})
            </button>
            <button
              onClick={() => setActiveTab('replied')}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'replied'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Replied ({selectedPostId ? filteredComments.filter(c => c.hasReplied).length : comments.filter(c => c.hasReplied).length})
            </button>
          </div>
        )}

        {/* Breadcrumb - Show when viewing single post */}
        {selectedPostId && (
          <div className="mb-3">
            <button
              onClick={handleBackToPosts}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-black transition-colors"
            >
              <span>←</span>
              <span>Back to Posts</span>
            </button>
          </div>
        )}

        {/* Batch Action Bar - Only show in All Comments view */}
        {viewMode === 'allComments' && selectedComments.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <div className="text-sm text-blue-900">
              <span className="font-semibold">{selectedComments.length}</span> comment{selectedComments.length > 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={openBatchManualReply}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <FiSend className="w-3 h-3" />
                Batch Reply
              </button>
              <button
                onClick={openBatchAIReply}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <FiZap className="w-3 h-3" />
                Batch AI Reply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
          </div>
        ) : viewMode === 'byPosts' ? (
          // Posts View
          postsWithStats.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <FiMessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm font-medium">No posts with comments</p>
              <p className="text-xs mt-1">Posts with comments will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-3">
              {postsWithStats.map((post) => (
                <div
                  key={post.id}
                  onClick={() => handlePostClick(post.id)}
                  className="relative bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col"
                >
                  {/* Badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {post.unrepliedCount > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-orange-600 text-white">
                        {post.unrepliedCount} new
                      </span>
                    )}
                    {post.mediaType === 'IMAGE' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
                        📷 Image
                      </span>
                    )}
                  </div>

                  {/* Post Thumbnail or Icon */}
                  <div className="flex justify-center mb-2">
                    {post.mediaUrl && post.mediaType === 'IMAGE' ? (
                      <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        <img 
                          src={post.mediaUrl} 
                          alt="Post media"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                        <FiMessageSquare className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Post Text */}
                  <div className="flex-1 mb-2">
                    <p className="text-xs text-gray-900 line-clamp-3 leading-snug text-center">
                      {truncateText(post.text, 100)}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div className="mb-2">
                    <p className="text-[10px] text-gray-500 flex items-center justify-center gap-0.5">
                      <FiClock className="w-2.5 h-2.5" />
                      {formatDate(post.timestamp)}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="border-t border-gray-100 pt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold text-gray-900">{post.totalComments} comments</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-orange-600">Unreplied:</span>
                      <span className="font-semibold text-orange-600">{post.unrepliedCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-green-600">Replied:</span>
                      <span className="font-semibold text-green-600">{post.repliedCount}</span>
                    </div>
                  </div>

                  {/* View Link */}
                  {post.permalink && (
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 text-[9px] text-gray-400 hover:text-blue-600 flex items-center justify-center gap-0.5"
                    >
                      <FiExternalLink className="w-2.5 h-2.5" />
                      View on Threads
                    </a>
                  )}
                </div>
              ))}
            </div>
          )
        ) : comments.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <FiMessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm font-medium">No comments yet</p>
            <p className="text-xs mt-1">Comments on your Threads posts will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-3">
            {filteredComments.map((comment) => (
              <div
                key={comment.id}
                className={`relative bg-white border rounded-lg p-2.5 hover:shadow-md transition-all flex flex-col ${
                  selectedComments.includes(comment.id)
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : comment.hasReplied
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                {/* Checkbox */}
                <div className="absolute top-1.5 right-1.5 z-10">
                  <input
                    type="checkbox"
                    checked={selectedComments.includes(comment.id)}
                    onChange={() => toggleSelectComment(comment.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Replied Badge */}
                {comment.hasReplied && (
                  <div className="absolute top-1.5 left-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-600 text-white">
                      ✓ Replied
                    </span>
                  </div>
                )}

                {/* Header - Centered */}
                <div className="flex flex-col items-center mb-2 pt-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-semibold mb-1.5">
                    {comment.username[0].toUpperCase()}
                  </div>
                  <p className="text-xs font-semibold text-gray-900 truncate max-w-full px-2 text-center">
                    @{comment.username}
                  </p>
                  <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
                    <FiClock className="w-2.5 h-2.5" />
                    {formatDate(comment.timestamp)}
                  </p>
                </div>

                {/* Comment Text - Main Content */}
                <div className="flex-1 mb-2">
                  <p className="text-xs text-gray-900 line-clamp-4 leading-snug text-center">
                    {comment.text}
                  </p>
                </div>

                {/* Post Context - Minimal */}
                {comment.postText && (
                  <div className="mb-2 pb-1.5 border-t border-gray-100 pt-1.5">
                    <p className="text-[9px] text-gray-400 text-center line-clamp-1">
                      On: {comment.postText}
                    </p>
                  </div>
                )}

                {/* Action Buttons - Side by Side */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openManualReply(comment)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-black text-white rounded hover:bg-gray-800 transition-colors"
                  >
                    <FiSend className="w-3 h-3" />
                    Reply
                  </button>
                  <button
                    onClick={() => openAIReply(comment)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    <FiZap className="w-3 h-3" />
                    AI
                  </button>
                </div>

                {/* View Post Link - Bottom */}
                {comment.postPermalink && (
                  <a
                    href={comment.postPermalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 text-[9px] text-gray-400 hover:text-blue-600 flex items-center justify-center gap-0.5"
                  >
                    <FiExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {replyModal.open && replyModal.comment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {replyModal.type === 'manual' ? 'Reply to Comment' : 'AI Reply'}
              </h3>
              <button
                onClick={closeReplyModal}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Original Comment */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Comment from @{replyModal.comment.username}:
                </label>
                <div className="bg-gray-100 rounded-lg p-3">
                  <p className="text-sm text-gray-900">{replyModal.comment.text}</p>
                </div>
              </div>

              {/* Reply Input */}
              {replyModal.type === 'manual' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Your reply:
                  </label>
                  <textarea
                    value={manualReplyText}
                    onChange={(e) => setManualReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full h-32 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {manualReplyText.length} characters
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-gray-700">
                      AI Generated Reply:
                    </label>
                    <button
                      onClick={generateAIReply}
                      disabled={generatingAI}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {generatingAI ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FiZap className="w-3 h-3" />
                          Generate
                        </>
                      )}
                    </button>
                  </div>

                  {aiReplyText ? (
                    <>
                      <textarea
                        value={aiReplyText}
                        onChange={(e) => setAiReplyText(e.target.value)}
                        placeholder="AI reply will appear here..."
                        className="w-full h-32 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        You can edit the AI-generated reply before sending
                      </p>
                    </>
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center bg-gray-50 border border-gray-300 rounded-lg">
                      <p className="text-sm text-gray-500">Click "Generate" to create AI reply</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeReplyModal}
                disabled={sendingReply}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={sendReply}
                disabled={sendingReply || (replyModal.type === 'manual' ? !manualReplyText.trim() : !aiReplyText.trim())}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingReply ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FiSend className="w-4 h-4" />
                    Send Reply
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Reply Modal */}
      {batchModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {batchModal.type === 'manual' ? 'Batch Reply' : 'Batch AI Reply'}
              </h3>
              <button
                onClick={closeBatchModal}
                disabled={sendingBatch}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Selected Count */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">{selectedComments.length}</span> comment{selectedComments.length > 1 ? 's' : ''} will receive {batchModal.type === 'manual' ? 'the same' : 'AI-generated'} reply
                </p>
              </div>

              {/* Reply Input - Manual Only */}
              {batchModal.type === 'manual' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Reply message (will be sent to all selected comments):
                  </label>
                  <textarea
                    value={batchReplyText}
                    onChange={(e) => setBatchReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full h-32 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={sendingBatch}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {batchReplyText.length} characters • Same reply for all
                  </p>
                </div>
              )}

              {/* Delay Settings */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Delay between replies (to avoid spam detection):
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max={batchDelayUnit === 'minutes' ? 10 : 60}
                    value={batchDelay}
                    onChange={(e) => setBatchDelay(parseInt(e.target.value) || 1)}
                    disabled={sendingBatch}
                    className="w-20 px-2 py-1.5 text-sm text-gray-900 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select
                    value={batchDelayUnit}
                    onChange={(e) => setBatchDelayUnit(e.target.value as 'seconds' | 'minutes')}
                    disabled={sendingBatch}
                    className="flex-1 px-2 py-1.5 text-sm text-gray-900 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                  </select>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Recommended: 2-5 seconds or 0.5-1 minute
                </p>
              </div>

              {/* AI Generation & Preview */}
              {batchModal.type === 'ai' && (
                <div className="space-y-3">
                  {Object.keys(batchAIReplies).length === 0 ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-900 mb-2">
                        ⚡ AI will generate a unique, personalized reply for each selected comment.
                      </p>
                      <button
                        onClick={generateBatchAIReplies}
                        disabled={generatingBatchAI}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {generatingBatchAI ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generating {selectedComments.length} replies...
                          </>
                        ) : (
                          <>
                            <FiZap className="w-4 h-4" />
                            Generate AI Replies
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-700">Review & Edit AI Replies:</p>
                        <button
                          onClick={generateBatchAIReplies}
                          disabled={generatingBatchAI || sendingBatch}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <FiRefreshCw className="w-3 h-3" />
                          Regenerate
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                        {comments
                          .filter(c => selectedComments.includes(c.id))
                          .map(comment => (
                            <div key={comment.id} className="bg-gray-50 rounded-lg p-2">
                              <div className="flex items-start gap-2 mb-1">
                                <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 text-[10px] font-semibold flex-shrink-0">
                                  {comment.username[0].toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <p className="text-[10px] font-semibold text-gray-900">@{comment.username}</p>
                                  <p className="text-[10px] text-gray-600 line-clamp-1">{comment.text}</p>
                                </div>
                              </div>
                              <textarea
                                value={batchAIReplies[comment.id] || ''}
                                onChange={(e) => updateBatchAIReply(comment.id, e.target.value)}
                                className="w-full h-16 px-2 py-1.5 text-xs text-gray-900 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none"
                                disabled={sendingBatch}
                                placeholder="AI reply..."
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Bar */}
              {sendingBatch && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-medium">Sending replies...</span>
                    <span className="text-gray-600">
                      {batchProgress.current} / {batchProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>✅ Success: {batchProgress.success}</span>
                    <span>❌ Failed: {batchProgress.failed}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeBatchModal}
                disabled={sendingBatch}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={sendBatchReply}
                disabled={
                  sendingBatch || 
                  (batchModal.type === 'manual' && !batchReplyText.trim()) ||
                  (batchModal.type === 'ai' && Object.keys(batchAIReplies).length === 0)
                }
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingBatch ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending {batchProgress.current}/{batchProgress.total}
                  </>
                ) : (
                  <>
                    <FiSend className="w-4 h-4" />
                    Send to {selectedComments.length} Comment{selectedComments.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
