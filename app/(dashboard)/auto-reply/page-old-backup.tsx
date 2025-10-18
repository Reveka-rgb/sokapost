'use client'

import { useState, useEffect } from 'react'
import { FiSave, FiZap, FiInfo, FiKey, FiEdit, FiPause, FiChevronDown, FiChevronUp, FiX, FiPlus } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Settings {
  enabled: boolean
  mode: 'ai' | 'keyword' | 'manual' | 'off'
  customPrompt: string | null
  aiDelay: number
  maxRepliesPerHour: number
  onlyFromFollowers: boolean
  excludeKeywords: string | null
  monitorAllPosts: boolean
  selectedPostIds?: string | null
}

interface ExpandedSections {
  mode: boolean
  filters: boolean
  aiConfig: boolean
  posts: boolean
}

export default function AutoReplyPage() {
  const [settings, setSettings] = useState<Settings>({
    enabled: false,
    mode: 'ai',
    customPrompt: null,
    aiDelay: 2,
    maxRepliesPerHour: 30,
    onlyFromFollowers: false,
    excludeKeywords: null,
    monitorAllPosts: true,
  })

  const [defaultPrompt, setDefaultPrompt] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false)
  const [triggering, setTriggering] = useState(false)

  // Exclude keywords as array
  const [excludeKeywordsList, setExcludeKeywordsList] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState('')

  // Posts selection
  const [posts, setPosts] = useState<Array<{ id: string; text: string; timestamp: string }>>([])
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    // Only fetch posts if monitorAllPosts is false
    if (!settings.monitorAllPosts) {
      fetchPosts()
    }
  }, [settings.monitorAllPosts])

  useEffect(() => {
    // Parse exclude keywords
    if (settings.excludeKeywords) {
      try {
        const parsed = JSON.parse(settings.excludeKeywords)
        if (Array.isArray(parsed)) {
          setExcludeKeywordsList(parsed)
        }
      } catch (e) {
        console.error('Failed to parse exclude keywords')
      }
    } else {
      setExcludeKeywordsList([])
    }
  }, [settings.excludeKeywords])

  useEffect(() => {
    // Parse selected post IDs
    if (settings.selectedPostIds) {
      try {
        const parsed = JSON.parse(settings.selectedPostIds)
        if (Array.isArray(parsed)) {
          setSelectedPostIds(parsed)
        }
      } catch (e) {
        console.error('Failed to parse selected post IDs')
      }
    } else {
      setSelectedPostIds([])
    }
  }, [settings.selectedPostIds])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/auto-reply/settings')
      setSettings(response.data.settings)
      setDefaultPrompt(response.data.defaultPrompt || '')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true)
      // Fetch posts from Threads API directly
      const response = await axios.get('/api/threads/posts')
      setPosts(response.data.posts || [])
    } catch (error: any) {
      console.error('Failed to load posts:', error)
      const errorMsg = error.response?.data?.error || 'Failed to load posts'
      if (errorMsg.includes('not connected')) {
        toast.error('Threads account belum terkoneksi. Hubungkan dulu di Settings.')
      } else {
        toast.error(errorMsg)
      }
    } finally {
      setLoadingPosts(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const payload = {
        ...settings,
        excludeKeywords: excludeKeywordsList.length > 0 
          ? JSON.stringify(excludeKeywordsList)
          : null,
        selectedPostIds: !settings.monitorAllPosts && selectedPostIds.length > 0
          ? JSON.stringify(selectedPostIds)
          : null
      }

      await axios.post('/api/auto-reply/settings', payload)
      toast.success('✅ Settings saved successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (enabled: boolean) => {
    try {
      await axios.post('/api/auto-reply/toggle', { enabled })
      setSettings(prev => ({ ...prev, enabled }))
      toast.success(enabled ? '✅ Auto-reply enabled!' : '⏸️ Auto-reply disabled')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle')
    }
  }

  const addExcludeKeyword = () => {
    if (newKeyword.trim() && !excludeKeywordsList.includes(newKeyword.trim())) {
      setExcludeKeywordsList([...excludeKeywordsList, newKeyword.trim()])
      setNewKeyword('')
    }
  }

  const removeExcludeKeyword = (keyword: string) => {
    setExcludeKeywordsList(excludeKeywordsList.filter(k => k !== keyword))
  }

  const handleManualTrigger = async () => {
    if (!settings.enabled) {
      toast.error('Auto-reply belum diaktifkan!')
      return
    }

    if (!settings.monitorAllPosts && selectedPostIds.length === 0) {
      toast.error('Pilih minimal 1 post untuk dimonitor!')
      return
    }

    try {
      setTriggering(true)
      const response = await axios.post('/api/auto-reply/trigger')
      const stats = response.data.stats
      
      toast.success(
        `✅ Triggered! Processed: ${stats.processed}, Replied: ${stats.replied}, Skipped: ${stats.skipped}`
      )
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to trigger auto-reply')
    } finally {
      setTriggering(false)
    }
  }

  const togglePostSelection = (postId: string) => {
    if (selectedPostIds.includes(postId)) {
      setSelectedPostIds(selectedPostIds.filter(id => id !== postId))
    } else {
      setSelectedPostIds([...selectedPostIds, postId])
    }
  }

  const selectAllPosts = () => {
    setSelectedPostIds(posts.map((p: any) => p.id).filter(Boolean))
  }

  const deselectAllPosts = () => {
    setSelectedPostIds([])
  }

  const formatPostText = (text: string) => {
    if (!text) return '(Post tanpa text)'
    return text.length > 100 ? text.substring(0, 100) + '...' : text
  }

  const formatPostDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Auto Reply</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Balas otomatis ke replies di Threads posts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/auto-reply/keywords"
            className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Keywords
          </Link>
          <button
            onClick={handleManualTrigger}
            disabled={triggering || !settings.enabled}
            className="px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {triggering ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <FiZap className="w-3 h-3" />
                Test Now
              </>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FiSave className="w-3 h-3" />
                Save
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
        
        {/* LEFT COLUMN - Basic Settings */}
        <div className="space-y-4 overflow-y-auto pr-2">
          
          {/* Status Toggle - Compact */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Status</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  {settings.enabled ? 'Active' : 'Inactive'}
                </p>
              </div>
              <button
                onClick={() => handleToggle(!settings.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enabled ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Mode Selection - Compact Grid */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Reply Mode</h3>
            <div className="grid grid-cols-2 gap-2">
              {/* AI Mode */}
              <button
                onClick={() => setSettings(prev => ({ ...prev, mode: 'ai' }))}
                className={`p-3 border-2 rounded-lg text-left transition-all ${
                  settings.mode === 'ai'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <FiZap className={`w-3.5 h-3.5 ${settings.mode === 'ai' ? 'text-purple-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-semibold ${settings.mode === 'ai' ? 'text-gray-900' : 'text-gray-700'}`}>
                    AI
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Generate otomatis
                </p>
              </button>

              {/* Keyword Mode */}
              <button
                onClick={() => setSettings(prev => ({ ...prev, mode: 'keyword' }))}
                className={`p-3 border-2 rounded-lg text-left transition-all ${
                  settings.mode === 'keyword'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <FiKey className={`w-3.5 h-3.5 ${settings.mode === 'keyword' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-semibold ${settings.mode === 'keyword' ? 'text-gray-900' : 'text-gray-700'}`}>
                    Keyword
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Match & reply
                </p>
              </button>

              {/* Manual Mode */}
              <button
                onClick={() => setSettings(prev => ({ ...prev, mode: 'manual' }))}
                className={`p-3 border-2 rounded-lg text-left transition-all ${
                  settings.mode === 'manual'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <FiEdit className={`w-3.5 h-3.5 ${settings.mode === 'manual' ? 'text-yellow-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-semibold ${settings.mode === 'manual' ? 'text-gray-900' : 'text-gray-700'}`}>
                    Manual
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Review first
                </p>
              </button>

              {/* Off Mode */}
              <button
                onClick={() => setSettings(prev => ({ ...prev, mode: 'off' }))}
                className={`p-3 border-2 rounded-lg text-left transition-all ${
                  settings.mode === 'off'
                    ? 'border-gray-500 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <FiPause className={`w-3.5 h-3.5 ${settings.mode === 'off' ? 'text-gray-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-semibold ${settings.mode === 'off' ? 'text-gray-900' : 'text-gray-700'}`}>
                    Off
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Monitor only
                </p>
              </button>
            </div>
          </div>

          {/* Filters - Compact */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Filters</h3>

            {/* Only from followers */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700">Hanya Followers</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Balas dari followers saja
                </p>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, onlyFromFollowers: !prev.onlyFromFollowers }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  settings.onlyFromFollowers ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    settings.onlyFromFollowers ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Exclude Keywords */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Abaikan Keyword
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addExcludeKeyword()}
                  placeholder="spam, stop..."
                  className="flex-1 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-transparent"
                />
                <button
                  onClick={addExcludeKeyword}
                  className="px-3 py-1.5 text-xs font-semibold bg-black text-white rounded-lg hover:bg-gray-800"
                >
                  +
                </button>
              </div>
              
              {excludeKeywordsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {excludeKeywordsList.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {keyword}
                      <button
                        onClick={() => removeExcludeKeyword(keyword)}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN - Configuration & Posts */}
        <div className="space-y-4 overflow-y-auto pr-2">

          {/* AI Configuration (only show if AI mode) */}
          {settings.mode === 'ai' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">AI Configuration</h3>

              {/* Custom Prompt */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-700">
                    Custom System Prompt
                  </label>
                  <button
                    onClick={() => setShowDefaultPrompt(!showDefaultPrompt)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                  >
                    <FiInfo className="w-2.5 h-2.5" />
                    {showDefaultPrompt ? 'Hide' : 'View'} Default
                  </button>
                </div>
                
                {showDefaultPrompt && (
                  <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                    <p className="text-xs text-gray-600 font-mono whitespace-pre-wrap">
                      {defaultPrompt}
                    </p>
                  </div>
                )}

                <textarea
                  value={settings.customPrompt || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, customPrompt: e.target.value }))}
                  placeholder="Kosongkan = pakai default, atau tulis custom prompt..."
                  className="w-full h-24 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {/* AI Delay & Max Replies - Inline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Delay (menit)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.aiDelay}
                    onChange={(e) => setSettings(prev => ({ ...prev, aiDelay: parseInt(e.target.value) || 2 }))}
                    className="w-full px-2 py-1.5 text-xs text-gray-900 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Max/Hour
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.maxRepliesPerHour}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxRepliesPerHour: parseInt(e.target.value) || 30 }))}
                    className="w-full px-2 py-1.5 text-xs text-gray-900 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Post Monitoring - Compact */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Post Monitoring</h3>

            {/* Monitor All Posts Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700">Monitor Semua Posts</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Atau pilih posts tertentu saja
                </p>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, monitorAllPosts: !prev.monitorAllPosts }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  settings.monitorAllPosts ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    settings.monitorAllPosts ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Select Specific Posts */}
            {!settings.monitorAllPosts && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-700">
                    Pilih Posts ({selectedPostIds.length})
                  </p>
                  <div className="flex gap-1.5 text-xs">
                    <button
                      onClick={selectAllPosts}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                      disabled={loadingPosts}
                    >
                      All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAllPosts}
                      className="text-gray-600 hover:text-gray-700 font-medium"
                      disabled={loadingPosts}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {loadingPosts ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-xs">
                    Belum ada published posts
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {posts.map((post: any) => (
                      <label
                        key={post.id}
                        className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPostIds.includes(post.id)}
                          onChange={() => togglePostSelection(post.id)}
                          className="mt-0.5 w-3.5 h-3.5 text-black border-gray-300 rounded focus:ring-black"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-900 line-clamp-2 leading-snug">
                            {formatPostText(post.text)}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs text-gray-500">
                              {formatPostDate(post.timestamp)}
                            </p>
                            {post.has_replies && (
                              <span className="text-xs text-green-600">
                                Has replies
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
