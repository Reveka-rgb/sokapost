'use client'

import { useState } from 'react'
import { FiSearch, FiFilter, FiExternalLink, FiMessageCircle, FiHash, FiImage, FiVideo, FiFileText } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

interface SearchResult {
  id: string
  text: string
  media_type: 'TEXT' | 'IMAGE' | 'VIDEO'
  media_url?: string
  permalink: string
  timestamp: string
  username: string
  has_replies: boolean
  is_quote_post: boolean
  is_reply: boolean
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState<'TOP' | 'RECENT'>('TOP')
  const [searchMode, setSearchMode] = useState<'KEYWORD' | 'TAG'>('KEYWORD')
  const [mediaType, setMediaType] = useState<'' | 'TEXT' | 'IMAGE' | 'VIDEO'>('')
  
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Please enter a search query')
      return
    }

    try {
      setLoading(true)
      setSearched(true)
      
      const params = new URLSearchParams({
        q: query,
        search_type: searchType,
        search_mode: searchMode,
        limit: '50'
      })

      if (mediaType) {
        params.append('media_type', mediaType)
      }

      const response = await axios.get(`/api/threads/search?${params.toString()}`)
      setResults(response.data.data || [])
      
      if (response.data.data.length === 0) {
        toast('No results found', { icon: 'ℹ️' })
      } else {
        toast.success(`Found ${response.data.data.length} results`)
      }
    } catch (error: any) {
      console.error('Search error:', error)
      toast.error(error.response?.data?.error || 'Failed to search')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getMediaTypeIcon = (type: string) => {
    switch (type) {
      case 'IMAGE': return <FiImage className="w-3 h-3" />
      case 'VIDEO': return <FiVideo className="w-3 h-3" />
      default: return <FiFileText className="w-3 h-3" />
    }
  }

  return (
    <div className="h-full flex flex-col pb-20 md:pb-8">
      {/* Header */}
      <div className="mb-3 md:mb-6 flex-shrink-0">
        <h1 className="text-lg md:text-xl font-bold text-gray-900">Threads Search</h1>
        <p className="text-xs text-gray-600 mt-0.5">
          Search public Threads posts by keyword or topic tag
        </p>
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-6 min-h-0">
        
        {/* LEFT COLUMN - Search Form & Filters */}
        <div className="w-full md:w-1/2 flex-shrink-0">
          <div className="space-y-3 md:space-y-4 h-full overflow-y-auto md:pr-2">
          
          {/* Search Input */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 space-y-2 md:space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Search Query</h3>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={searchMode === 'KEYWORD' ? 'Enter keywords...' : 'Enter topic tag...'}
                className="flex-1 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md md:rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold bg-black text-white rounded-md md:rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-1 md:gap-2"
              >
                {loading ? (
                  <div className="w-3 md:w-4 h-3 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiSearch className="w-3 md:w-4 h-3 md:h-4" />
                )}
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 space-y-2 md:space-y-3">
            <div className="flex items-center gap-2">
              <FiFilter className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
            </div>

            {/* Search Mode */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Search Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSearchMode('KEYWORD')}
                  className={`p-2 border-2 rounded-lg text-left transition-all ${
                    searchMode === 'KEYWORD'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <FiSearch className={`w-3 h-3 ${searchMode === 'KEYWORD' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-xs font-semibold text-gray-900">Keyword</span>
                  </div>
                </button>

                <button
                  onClick={() => setSearchMode('TAG')}
                  className={`p-2 border-2 rounded-lg text-left transition-all ${
                    searchMode === 'TAG'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <FiHash className={`w-3 h-3 ${searchMode === 'TAG' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-xs font-semibold text-gray-900">Topic Tag</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Search Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSearchType('TOP')}
                  className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
                    searchType === 'TOP'
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Top Posts
                </button>
                <button
                  onClick={() => setSearchType('RECENT')}
                  className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
                    searchType === 'RECENT'
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Recent
                </button>
              </div>
            </div>

            {/* Media Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Media Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setMediaType('')}
                  className={`px-2 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
                    mediaType === ''
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setMediaType('TEXT')}
                  className={`px-2 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
                    mediaType === 'TEXT'
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Text
                </button>
                <button
                  onClick={() => setMediaType('IMAGE')}
                  className={`px-2 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
                    mediaType === 'IMAGE'
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Image
                </button>
                <button
                  onClick={() => setMediaType('VIDEO')}
                  className={`px-2 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
                    mediaType === 'VIDEO'
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Video
                </button>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-blue-900 mb-1 md:mb-2">Search Tips</h4>
            <ul className="text-[10px] md:text-xs text-blue-800 space-y-0.5 md:space-y-1 list-disc list-inside leading-relaxed">
              <li>Use keywords to find posts containing specific terms</li>
              <li>Use topic tags to search by hashtags (without #)</li>
              <li>Limit: 2,200 queries per 24 hours</li>
              <li>Empty results don't count against your quota</li>
            </ul>
          </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Search Results */}
        <div className="w-full md:w-1/2 flex-shrink-0">
          <div className="space-y-3 md:space-y-4 h-full overflow-y-auto md:pr-2">
          
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {searched ? `Results (${results.length})` : 'Search Results'}
            </h3>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center h-48 md:h-64">
              <div className="animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-black"></div>
            </div>
          ) : !searched ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12 text-center">
              <FiSearch className="w-8 md:w-12 h-8 md:h-12 text-gray-300 mx-auto mb-2 md:mb-3" />
              <p className="text-xs md:text-sm text-gray-500">
                Enter a keyword or topic tag to start searching
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12 text-center">
              <p className="text-xs md:text-sm text-gray-500">
                No results found for "{query}"
              </p>
              <p className="text-[10px] md:text-xs text-gray-400 mt-2">
                Try different keywords or filters
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 hover:shadow-sm transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                      <span className="text-xs md:text-sm font-semibold text-gray-900 truncate">
                        @{result.username}
                      </span>
                      <span className="text-[10px] md:text-xs text-gray-500">
                        {formatDate(result.timestamp)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Media Type Badge */}
                      <span className="px-1.5 md:px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] md:text-xs rounded-full flex items-center gap-0.5 md:gap-1">
                        {getMediaTypeIcon(result.media_type)}
                        <span className="hidden sm:inline">{result.media_type}</span>
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-xs md:text-sm text-gray-700 mb-2 md:mb-3 leading-relaxed">
                    {result.text || '(No text)'}
                  </p>

                  {/* Media Preview */}
                  {result.media_url && result.media_type === 'IMAGE' && (
                    <img
                      src={result.media_url}
                      alt="Post media"
                      className="w-full rounded-md md:rounded-lg border border-gray-200 mb-2 md:mb-3 max-h-48 md:max-h-64 object-cover"
                    />
                  )}

                  {/* Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-gray-500">
                      {result.has_replies && (
                        <span className="flex items-center gap-0.5 md:gap-1">
                          <FiMessageCircle className="w-3 h-3" />
                          <span className="hidden sm:inline">Has replies</span>
                        </span>
                      )}
                      {result.is_quote_post && (
                        <span className="hidden sm:inline">Quote post</span>
                      )}
                      {result.is_reply && (
                        <span className="hidden sm:inline">Reply</span>
                      )}
                    </div>

                    <a
                      href={result.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] md:text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                    >
                      <span className="hidden sm:inline">View on Threads</span>
                      <span className="sm:hidden">View</span>
                      <FiExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          </div>
        </div>
      </div>
    </div>
  )
}
