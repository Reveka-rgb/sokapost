'use client'

import { useState, useEffect } from 'react'
import { FiMessageSquare, FiUser, FiClock, FiFilter, FiChevronLeft, FiChevronRight, FiSend, FiZap, FiX, FiRefreshCw } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface ReplyHistory {
  id: string
  postId: string
  replyId: string
  fromUsername: string
  replyText: string
  ourReplyId?: string
  ourReplyText?: string
  status: string
  replyMode?: string
  matchedKeyword?: string
  repliedAt?: string
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AutoReplyHistoryPage() {
  const [history, setHistory] = useState<ReplyHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState('all')

  // Reply Modals
  const [replyModal, setReplyModal] = useState<{
    open: boolean
    item: ReplyHistory | null
    type: 'manual' | 'ai'
  }>({ open: false, item: null, type: 'manual' })
  
  const [manualReplyText, setManualReplyText] = useState('')
  const [aiReplyText, setAiReplyText] = useState('')
  const [generatingAI, setGeneratingAI] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [pagination.page, statusFilter, modeFilter])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      if (modeFilter !== 'all') {
        params.append('mode', modeFilter)
      }

      const response = await axios.get(`/api/auto-reply/history?${params}`)
      console.log('History API response:', response.data)
      setHistory(response.data.history || [])
      setPagination(response.data.pagination)
    } catch (error: any) {
      console.error('History fetch error:', error)
      toast.error(error.response?.data?.error || 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      replied: { bg: 'bg-green-100', text: 'text-green-700', label: 'Replied' },
      processing: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Processing' },
      pending: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pending' },
      skipped: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Skipped' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' }
    }
    
    const badge = badges[status] || badges.pending
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const getModeBadge = (mode?: string) => {
    if (!mode) return null
    
    const badges: Record<string, { icon: string; color: string }> = {
      ai: { icon: '🤖', color: 'text-purple-600' },
      keyword: { icon: '🔑', color: 'text-blue-600' },
      manual: { icon: '✋', color: 'text-yellow-600' },
      off: { icon: '⏸️', color: 'text-gray-600' }
    }
    
    const badge = badges[mode] || { icon: '?', color: 'text-gray-600' }
    return (
      <span className={`text-xs ${badge.color} font-medium`}>
        {badge.icon} {mode.toUpperCase()}
      </span>
    )
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

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '(No text)'
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const openManualReply = (item: ReplyHistory) => {
    setReplyModal({ open: true, item, type: 'manual' })
    setManualReplyText('')
  }

  const openAIReply = (item: ReplyHistory) => {
    setReplyModal({ open: true, item, type: 'ai' })
    setAiReplyText('')
  }

  const closeReplyModal = () => {
    setReplyModal({ open: false, item: null, type: 'manual' })
    setManualReplyText('')
    setAiReplyText('')
  }

  const generateAIReply = async () => {
    if (!replyModal.item) return

    try {
      setGeneratingAI(true)
      const response = await axios.post('/api/auto-reply/generate', {
        messageText: replyModal.item.replyText,
        fromUsername: replyModal.item.fromUsername
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
    if (!replyModal.item) return

    const replyText = replyModal.type === 'manual' ? manualReplyText : aiReplyText
    
    if (!replyText.trim()) {
      toast.error('Please enter a reply')
      return
    }

    try {
      setSendingReply(true)
      await axios.post(`/api/auto-reply/history/${replyModal.item.id}/reply`, {
        replyText: replyText.trim()
      })
      
      toast.success('Reply sent successfully!')
      closeReplyModal()
      fetchHistory() // Refresh list
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send reply')
    } finally {
      setSendingReply(false)
    }
  }

  const getTabCount = (status: string) => {
    // This would ideally come from API, but for now just showing
    return history.filter(h => status === 'all' || h.status === status).length
  }

  return (
    <div className="h-full flex flex-col pb-8 bg-gray-50">
      {/* Header */}
      <div className="mb-4 flex-shrink-0 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link
              href="/auto-reply"
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              <FiChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reply History</h1>
              <p className="text-xs text-gray-600 mt-0.5">
                {pagination.total} total replies
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => {
              setStatusFilter('all')
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              setStatusFilter('pending')
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Pending Review
          </button>
          <button
            onClick={() => {
              setStatusFilter('replied')
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === 'replied'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Replied
          </button>
          <button
            onClick={() => {
              setStatusFilter('processing')
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === 'processing'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Processing
          </button>
          <button
            onClick={() => {
              setStatusFilter('skipped')
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === 'skipped'
                ? 'bg-gray-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Skipped
          </button>
          <button
            onClick={() => {
              setStatusFilter('failed')
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === 'failed'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Failed
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <FiMessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm font-medium">No history found</p>
            <p className="text-xs mt-1 mb-4">Auto-reply history will appear here when you receive comments</p>
            <div className="text-left max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-900 mb-2">💡 To get started:</p>
              <ol className="text-xs text-blue-800 space-y-1.5 list-decimal list-inside">
                <li>Go to Auto Reply settings</li>
                <li>Enable auto-reply and select posts to monitor</li>
                <li>Wait for people to comment on your Threads posts</li>
                <li>Comments and replies will appear here</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                      {item.fromUsername[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        @{item.fromUsername}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getModeBadge(item.replyMode)}
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                {/* Content */}
                <div className="ml-10 space-y-2">
                  {/* Their Reply */}
                  <div className="bg-gray-100 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-1">Their reply:</p>
                    <p className="text-sm text-gray-900">
                      {truncateText(item.replyText)}
                    </p>
                  </div>

                  {/* Our Reply */}
                  {item.ourReplyText && (
                    <div className="bg-blue-50 rounded-lg p-2.5">
                      <p className="text-xs text-blue-600 mb-1">
                        Our reply:
                        {item.matchedKeyword && (
                          <span className="ml-1 text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">
                            🔑 {item.matchedKeyword}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-900">
                        {truncateText(item.ourReplyText)}
                      </p>
                      {item.repliedAt && (
                        <p className="text-[10px] text-blue-600 mt-1">
                          Sent {formatDate(item.repliedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Status specific info */}
                  {item.status === 'skipped' && !item.ourReplyText && (
                    <p className="text-xs text-gray-500 italic">
                      Reply was skipped (filtered or no keyword match)
                    </p>
                  )}
                  {item.status === 'pending' && (
                    <div className="space-y-2">
                      <p className="text-xs text-blue-600 italic">
                        Waiting for manual review
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openManualReply(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <FiSend className="w-3 h-3" />
                          Reply Manually
                        </button>
                        <button
                          onClick={() => openAIReply(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                        >
                          <FiZap className="w-3 h-3" />
                          Reply with AI
                        </button>
                      </div>
                    </div>
                  )}
                  {item.status === 'failed' && (
                    <div className="space-y-2">
                      <p className="text-xs text-red-600 italic">
                        Failed to send reply
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openManualReply(item)}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                          <FiRefreshCw className="w-3 h-3" />
                          Retry
                        </button>
                      </div>
                    </div>
                  )}
                  {item.status === 'processing' && (
                    <p className="text-xs text-yellow-600 italic">
                      Currently processing...
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between flex-shrink-0 bg-gray-50">
          <p className="text-xs text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 text-xs font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <FiChevronLeft className="w-3 h-3" />
              Prev
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1.5 text-xs font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next
              <FiChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Reply Modals */}
      {replyModal.open && replyModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {replyModal.type === 'manual' ? 'Manual Reply' : 'AI Reply'}
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
              {/* Original Message */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Original reply from @{replyModal.item.fromUsername}:
                </label>
                <div className="bg-gray-100 rounded-lg p-3">
                  <p className="text-sm text-gray-900">{replyModal.item.replyText}</p>
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
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
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
                        className="w-full h-32 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
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
    </div>
  )
}
