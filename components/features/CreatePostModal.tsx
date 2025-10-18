'use client'

import { useState, useEffect } from 'react'
import { FiX, FiImage, FiSmile, FiHash, FiMapPin, FiCalendar, FiClock, FiMoreHorizontal, FiHeart, FiMessageCircle, FiRepeat, FiSend, FiCheckCircle, FiZap } from 'react-icons/fi'
import { MdVerified } from 'react-icons/md'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import AIAssistantModal from './AIAssistantModal'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  username?: string
  userPhoto?: string
  prefilledDate?: string
  prefilledTime?: string
}

export default function CreatePostModal({ isOpen, onClose, username, userPhoto, prefilledDate, prefilledTime }: CreatePostModalProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [platforms, setPlatforms] = useState<('threads' | 'instagram')[]>([])
  const [connectedPlatforms, setConnectedPlatforms] = useState<{
    threads: boolean
    instagram: boolean
  }>({ threads: false, instagram: false })
  const [loadingPlatforms, setLoadingPlatforms] = useState(true)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  
  // Get today's date and current time for validation
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0] // YYYY-MM-DD
  }
  
  const getCurrentTime = () => {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createAnother, setCreateAnother] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [showMediaLibrary, setShowMediaLibrary] = useState(false)
  const [mediaLibrary, setMediaLibrary] = useState<Array<{ url: string; filename: string }>>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [selectedFromLibrary, setSelectedFromLibrary] = useState<Set<string>>(new Set())
  const [showAiAssistant, setShowAiAssistant] = useState(false)
  const [topic, setTopic] = useState('')
  const [location, setLocation] = useState('')

  // Check connected platforms on mount
  useEffect(() => {
    if (isOpen) {
      checkConnectedPlatforms()
    }
  }, [isOpen])

  const checkConnectedPlatforms = async () => {
    setLoadingPlatforms(true)
    try {
      const response = await axios.get('/api/accounts')
      const { threads, instagram } = response.data

      const connected = {
        threads: threads.connected,
        instagram: instagram.connected
      }
      
      setConnectedPlatforms(connected)
      
      // Auto-select first connected platform
      if (connected.threads) {
        setPlatforms(['threads'])
      } else if (connected.instagram) {
        setPlatforms(['instagram'])
      }
    } catch (error) {
      console.error('Failed to check platforms:', error)
    } finally {
      setLoadingPlatforms(false)
    }
  }

  // Set prefilled date and time when provided
  useEffect(() => {
    if (prefilledDate) {
      setScheduledDate(prefilledDate)
    }
    if (prefilledTime) {
      setScheduledTime(prefilledTime)
    }
  }, [prefilledDate, prefilledTime])

  const loadMediaLibrary = async () => {
    if (mediaLibrary.length > 0) {
      setShowMediaLibrary(true)
      return
    }

    setLoadingLibrary(true)
    
    try {
      const response = await axios.get('/api/media-library')
      setMediaLibrary(response.data.media)
      setLoadingLibrary(false)
      setShowMediaLibrary(true)
    } catch (error) {
      toast.error('Failed to load media library')
      setLoadingLibrary(false)
    }
  }

  const toggleMediaLibraryItem = (url: string) => {
    const newSelected = new Set(selectedFromLibrary)
    if (newSelected.has(url)) {
      newSelected.delete(url)
    } else {
      if (mediaUrls.length + newSelected.size >= 10) {
        toast.error('Maximum 10 images allowed')
        return
      }
      newSelected.add(url)
    }
    setSelectedFromLibrary(newSelected)
  }

  const addFromMediaLibrary = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    const urls = Array.from(selectedFromLibrary)
    setMediaUrls([...mediaUrls, ...urls])
    setSelectedFromLibrary(new Set())
    setShowMediaLibrary(false)
    toast.success(`${urls.length} image(s) added!`)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (mediaFiles.length + files.length > 10) {
      toast.error('Maximum 10 images allowed')
      return
    }

    setUploading(true)
    
    try {
      const uploadedUrls: string[] = []
      
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await axios.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        
        if (response.data.url) {
          uploadedUrls.push(response.data.url)
        }
      }
      
      setMediaFiles([...mediaFiles, ...files])
      setMediaUrls([...mediaUrls, ...uploadedUrls])
      toast.success(`${files.length} image(s) uploaded!`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload images')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index))
    setMediaUrls(mediaUrls.filter((_, i) => i !== index))
  }

  const handlePublishNow = async () => {
    if (!content.trim() && mediaUrls.length === 0) {
      toast.error('Please enter post content or add media')
      return
    }

    if (platforms.includes('instagram') && mediaUrls.length === 0) {
      toast.error('📸 Instagram requires at least one image')
      return
    }

    if (platforms.length === 0) {
      toast.error('Please select at least one platform')
      return
    }

    try {
      setIsSubmitting(true)
      
      // console.log('🚀 Publishing to:', platforms.join(', '))
      
      // Create posts for each platform
      for (const platform of platforms) {
        await axios.post('/api/posts', {
          content: content.trim(),
          platform: platform,
          publishImmediately: true,
          mediaUrls: mediaUrls,
          topic: topic.trim() || undefined,
          location: location.trim() || undefined
        })
      }

      const platformNames = platforms.map(p => p === 'instagram' ? 'Instagram' : 'Threads').join(' & ')
      toast.success(`🚀 Post scheduled for ${platformNames}! (within 1 minute)`)
      
      if (!createAnother) {
        onClose()
        router.refresh()
      } else {
        setContent('')
        setMediaFiles([])
        setMediaUrls([])
        setTopic('')
        setLocation('')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to publish post')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSchedulePost = async () => {
    if (!content.trim() && mediaUrls.length === 0) {
      toast.error('Please enter post content or add media')
      return
    }

    if (platforms.includes('instagram') && mediaUrls.length === 0) {
      toast.error('📸 Instagram requires at least one image')
      return
    }

    if (platforms.length === 0) {
      toast.error('Please select at least one platform')
      return
    }

    if (!scheduledDate) {
      toast.error('⏰ Please select a date')
      return
    }

    if (!scheduledTime) {
      toast.error('🕐 Please select a time')
      return
    }

    // Validate scheduled time
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)
    const now = new Date()
    const diffMinutes = (scheduledAt.getTime() - now.getTime()) / (1000 * 60)

    if (scheduledAt <= now) {
      toast.error('⚠️ Scheduled time must be in the future')
      return
    }

    if (diffMinutes < 2) {
      toast.error('⏱️ Please schedule at least 2 minutes from now')
      return
    }

    try {
      setIsSubmitting(true)
      
      // Create scheduled posts for each platform
      for (const platform of platforms) {
        await axios.post('/api/posts', {
          content: content.trim(),
          platform: platform,
          scheduledAt: scheduledAt.toISOString(),
          status: 'scheduled',
          mediaUrls: mediaUrls,
          topic: topic.trim() || undefined,
          location: location.trim() || undefined
        })
      }

      const platformNames = platforms.map(p => p === 'instagram' ? 'Instagram' : 'Threads').join(' & ')
      toast.success(`Post scheduled for ${platformNames}!`)
      
      if (!createAnother) {
        onClose()
        router.refresh()
      } else {
        setContent('')
        setScheduledDate('')
        setScheduledTime('')
        setMediaFiles([])
        setMediaUrls([])
        setTopic('')
        setLocation('')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to schedule post')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!content.trim() && mediaUrls.length === 0) {
      toast.error('Please enter post content or add media')
      return
    }

    try {
      setIsSubmitting(true)
      
      // For drafts, use the first selected platform
      const response = await axios.post('/api/posts', {
        content: content.trim(),
        platform: platforms[0] || 'threads',
        status: 'draft',
        mediaUrls: mediaUrls,
        topic: topic.trim() || undefined,
        location: location.trim() || undefined
      })

      toast.success('Draft saved!')
      
      if (!createAnother) {
        onClose()
        router.refresh()
      } else {
        setContent('')
        setMediaFiles([])
        setMediaUrls([])
        setTopic('')
        setLocation('')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save draft')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAiInsert = (generatedContent: string) => {
    setContent(generatedContent)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Main Modal */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 modal-backdrop" 
        onClick={(e) => {
          if (showMediaLibrary) {
            e.stopPropagation()
            return
          }
          onClose()
        }}
      >
        <div 
          className={`bg-white rounded-xl shadow-2xl w-full max-h-[90vh] overflow-hidden flex modal-content ${showAiAssistant ? 'max-w-[1400px]' : 'max-w-6xl'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* AI Assistant Panel - Left */}
          {showAiAssistant && (
            <AIAssistantModal 
              isOpen={showAiAssistant}
              onClose={() => setShowAiAssistant(false)}
              onInsert={handleAiInsert}
            />
          )}

          {/* Center Panel - Create Post */}
          <div className="flex-1 flex flex-col border-r border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-16 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-bold text-gray-900">Create Post</h2>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Add Tags ▼
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Platform Selector with Profile */}
              <div className="mb-6">
                {loadingPlatforms ? (
                  <div className="text-sm text-gray-500">Loading platforms...</div>
                ) : (
                  <div className="flex items-center gap-3">
                    {/* Threads */}
                    {connectedPlatforms.threads && (
                      <button
                        type="button"
                        onClick={() => {
                          setPlatforms(prev => 
                            prev.includes('threads') 
                              ? prev.filter(p => p !== 'threads')
                              : [...prev, 'threads']
                          )
                        }}
                        className="relative"
                      >
                        <div className={`transition-all ${
                          platforms.includes('threads') ? '' : 'grayscale opacity-60 hover:opacity-80'
                        }`}>
                          {userPhoto ? (
                            <img 
                              src={userPhoto}
                              alt="Threads"
                              className="w-14 h-14 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-lg">
                              {username ? username[0].toUpperCase() : 'T'}
                            </div>
                          )}
                        </div>
                        {/* Threads Badge */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-black flex items-center justify-center border-2 border-white">
                          <span className="text-white text-[10px] font-bold">@</span>
                        </div>
                        {/* Checkmark */}
                        {platforms.includes('threads') && (
                          <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-black rounded-full flex items-center justify-center border-2 border-white">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )}

                    {/* Instagram */}
                    {connectedPlatforms.instagram && (
                      <button
                        type="button"
                        onClick={() => {
                          setPlatforms(prev => 
                            prev.includes('instagram') 
                              ? prev.filter(p => p !== 'instagram')
                              : [...prev, 'instagram']
                          )
                        }}
                        className="relative"
                      >
                        <div className={`transition-all ${
                          platforms.includes('instagram') ? '' : 'grayscale opacity-60 hover:opacity-80'
                        }`}>
                          {userPhoto ? (
                            <img 
                              src={userPhoto}
                              alt="Instagram"
                              className="w-14 h-14 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                              {username ? username[0].toUpperCase() : 'I'}
                            </div>
                          )}
                        </div>
                        {/* Instagram Badge */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center border-2 border-white">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                          </svg>
                        </div>
                        {/* Checkmark */}
                        {platforms.includes('instagram') && (
                          <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center border-2 border-white">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )}

                    {/* No platforms connected */}
                    {!connectedPlatforms.threads && !connectedPlatforms.instagram && (
                      <div className="text-sm text-red-600">
                        No platforms connected. Please connect a platform in <a href="/connections" className="underline font-semibold">Settings</a>.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Platform Info */}
              <div className="mb-4 -mt-2">
                {platforms.length === 0 && (
                  <p className="text-xs text-red-500">
                    Please select at least one platform
                  </p>
                )}
                {platforms.includes('instagram') && (
                  <p className="text-xs text-gray-500">
                    Instagram requires at least one image to post
                  </p>
                )}
                {platforms.length > 0 && (
                  <p className="text-xs text-gray-600">
                    Post will be published to: {platforms.map(p => p === 'instagram' ? 'Instagram' : 'Threads').join(' & ')}
                  </p>
                )}
              </div>

              {/* Text Area */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full min-h-[200px] text-gray-900 text-[15px] resize-none focus:outline-none placeholder-gray-400"
                maxLength={500}
              />

              {/* Character Count */}
              <div className="text-right text-xs text-gray-500 mb-3">
                {content.length}/500
              </div>

              {/* Media Upload Area */}
              <div className="mb-4">
                <input
                  type="file"
                  id="media-upload"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
                
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <label
                    htmlFor="media-upload"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer"
                  >
                    {uploading ? (
                      <>
                        <div className="w-5 h-5 mb-1.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-gray-600">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <FiImage className="w-5 h-5 mb-1.5 text-gray-400" />
                        <p className="text-xs text-gray-600">Upload New</p>
                      </>
                    )}
                  </label>

                  <button
                    type="button"
                    onClick={loadMediaLibrary}
                    disabled={loadingLibrary}
                    className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingLibrary ? (
                      <>
                        <div className="w-5 h-5 mb-1.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-blue-600">Loading...</p>
                      </>
                    ) : (
                      <>
                        <FiImage className="w-5 h-5 mb-1.5 text-blue-600" />
                        <p className="text-xs text-blue-600">Browse Library</p>
                      </>
                    )}
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 text-center">
                  Max 10 images, 10MB each
                </p>

                {/* Preview uploaded images */}
                {mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {mediaUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => handleRemoveMedia(index)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 py-3 border-y border-gray-200">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Add emoji">
                  <FiSmile className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Add hashtag">
                  <FiHash className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Add location">
                  <FiMapPin className="w-4 h-4 text-gray-600" />
                </button>
                <button 
                  onClick={() => setShowAiAssistant(true)}
                  className={`p-2 hover:bg-purple-100 rounded-full transition-colors ${showAiAssistant ? 'bg-purple-100' : ''}`} 
                  title="AI Assistant"
                >
                  <FiZap className="w-4 h-4 text-purple-600" />
                </button>
                <div className="ml-auto text-xs text-gray-500">
                  {content.length} <span className="text-gray-400">characters</span>
                </div>
              </div>

              {/* Topic & Location */}
              <div className="space-y-3 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Type the topic"
                    className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Type the location"
                    className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 space-y-3">
              {/* Schedule Picker Row */}
              <div className="flex items-start gap-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer flex-shrink-0 pt-2">
                  <input
                    type="checkbox"
                    checked={createAnother}
                    onChange={(e) => setCreateAnother(e.target.checked)}
                    className="rounded border-gray-300 w-4 h-4"
                  />
                  <span className="text-gray-700">Create Another</span>
                </label>

                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg bg-white">
                    <FiCalendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => {
                        setScheduledDate(e.target.value)
                        if (!scheduledTime) {
                          setScheduledTime(getCurrentTime())
                        }
                      }}
                      min={getTodayDate()}
                      className="text-sm focus:outline-none flex-1 text-gray-900"
                    />
                    <div className="w-px h-4 bg-gray-300"></div>
                    <FiClock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="text-sm focus:outline-none w-24 text-gray-900"
                    />
                  </div>
                  {scheduledDate && scheduledTime && (
                    <p className="text-[10px] text-gray-500 px-1">
                      ⏰ Min: 2 minutes from now
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Save Draft
                </button>

                <div className="flex-1"></div>

                <button
                  onClick={handlePublishNow}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Publish Now
                </button>

                <button
                  onClick={handleSchedulePost}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Schedule Post
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="w-[400px] bg-gray-50 flex flex-col">
            {/* Preview Header */}
            <div className="px-6 h-16 border-b border-gray-200 bg-white flex items-center">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">
                  {platforms.map(p => p === 'instagram' ? 'Instagram' : 'Threads').join(' & ')} Preview
                </h3>
                <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-white text-[10px]">ⓘ</span>
                </div>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Show preview for each selected platform */}
              {platforms.includes('threads') && (
                <>
                {/* Threads Preview */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                {/* Post Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative">
                    {userPhoto ? (
                      <img 
                        src={userPhoto}
                        alt={username || 'User'}
                        className="w-10 h-10 rounded-full object-cover shadow-md"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-bold shadow-md">
                        {username ? username[0].toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center border-2 border-white">
                      <span className="text-white text-[10px]">@</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-gray-900">{username || 'User'}</span>
                      <MdVerified className="w-4 h-4 text-blue-500" />
                      {topic && (
                        <>
                          <span className="text-gray-900">✨</span>
                          <span className="text-gray-900">{topic}</span>
                        </>
                      )}
                      <span className="text-gray-400">·</span>
                      <span className="text-sm text-gray-600">2h</span>
                    </div>
                    {location && (
                      <div className="flex items-center gap-1 mt-1">
                        <FiMapPin className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-600">{location}</span>
                      </div>
                    )}
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded-full">
                    <FiMoreHorizontal className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Post Content */}
                <div className="mb-3">
                  <p className="text-gray-900 text-[15px] whitespace-pre-wrap">
                    {content || 'Your post will appear here...'}
                  </p>
                </div>

                {/* Media Preview */}
                {mediaUrls.length > 0 && (
                  <div className={`grid gap-2 mb-3 ${mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {mediaUrls.slice(0, 4).map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        {index === 3 && mediaUrls.length > 4 && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">+{mediaUrls.length - 4}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center gap-4 pt-3 border-t border-gray-200">
                  <button className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors">
                    <FiHeart className="w-5 h-5" />
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
                    <FiMessageCircle className="w-5 h-5" />
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors">
                    <FiRepeat className="w-5 h-5" />
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors ml-auto">
                    <FiSend className="w-5 h-5" />
                  </button>
                </div>
              </div>
              </>
              )}

              {/* Show both previews if both platforms selected */}
              {platforms.includes('threads') && platforms.includes('instagram') && (
                <div className="h-6 border-t border-gray-200 my-4"></div>
              )}

              {platforms.includes('instagram') && (
                <>
                {/* Instagram Preview */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Instagram Header */}
                  <div className="p-3 flex items-center justify-between border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      {userPhoto ? (
                        <img
                          src={userPhoto}
                          alt={username || 'User'}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-semibold text-xs">
                          {username ? username[0].toUpperCase() : 'U'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-sm text-gray-900">{username || 'username'}</span>
                          <MdVerified className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        {location && (
                          <div className="text-xs text-gray-600">{location}</div>
                        )}
                      </div>
                    </div>
                    <button className="p-1">
                      <FiMoreHorizontal className="w-5 h-5 text-gray-900" />
                    </button>
                  </div>

                  {/* Instagram Media */}
                  {mediaUrls.length > 0 ? (
                    <div className="aspect-square bg-gray-100 relative">
                      <img
                        src={mediaUrls[0]}
                        alt="Instagram post"
                        className="w-full h-full object-cover"
                      />
                      {mediaUrls.length > 1 && (
                        <div className="absolute top-3 right-3">
                          <div className="bg-gray-900/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <rect x="3" y="3" width="7" height="7" rx="1"/>
                              <rect x="14" y="3" width="7" height="7" rx="1"/>
                              <rect x="14" y="14" width="7" height="7" rx="1"/>
                              <rect x="3" y="14" width="7" height="7" rx="1"/>
                            </svg>
                            <span>1/{mediaUrls.length}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-200 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <FiImage className="w-16 h-16 mx-auto mb-2" />
                        <p className="text-sm">Add an image</p>
                      </div>
                    </div>
                  )}

                  {/* Instagram Actions */}
                  <div className="p-3">
                    <div className="flex items-center gap-4 mb-3">
                      <button className="hover:opacity-60 transition-opacity">
                        <FiHeart className="w-6 h-6 text-gray-900" />
                      </button>
                      <button className="hover:opacity-60 transition-opacity">
                        <FiMessageCircle className="w-6 h-6 text-gray-900" />
                      </button>
                      <button className="hover:opacity-60 transition-opacity">
                        <FiSend className="w-6 h-6 text-gray-900" />
                      </button>
                    </div>

                    {/* Instagram Caption */}
                    {content && (
                      <div className="text-sm">
                        <span className="font-semibold text-gray-900">{username || 'username'}</span>{' '}
                        <span className="text-gray-900">
                          {content.length > 100 ? content.substring(0, 100) + '...' : content}
                        </span>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-2">2 HOURS AGO</div>
                  </div>
                </div>
                </>
              )}
            </div>

            {/* Preview Note */}
            <div className="px-6 py-3 border-t border-gray-200 bg-blue-50">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-[10px]">ⓘ</span>
                </div>
                <p className="text-xs text-blue-900">
                  <strong>Note:</strong> This is a preview of how your post will appear on {platforms.map(p => p === 'instagram' ? 'Instagram' : 'Threads').join(' & ')}.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Media Library Modal */}
        {showMediaLibrary && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]"
            onClick={(e) => {
              e.stopPropagation()
              setShowMediaLibrary(false)
            }}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Media Library</h3>
                <button
                  onClick={() => setShowMediaLibrary(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-4 gap-4">
                  {mediaLibrary.map((media, index) => (
                    <div
                      key={index}
                      onClick={() => toggleMediaLibraryItem(media.url)}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedFromLibrary.has(media.url)
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={media.url}
                        alt={media.filename}
                        className="w-full h-32 object-cover"
                      />
                      {selectedFromLibrary.has(media.url) && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <FiCheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedFromLibrary.size} selected
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowMediaLibrary(false)
                      setSelectedFromLibrary(new Set())
                    }}
                    className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => addFromMediaLibrary(e)}
                    disabled={selectedFromLibrary.size === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Add {selectedFromLibrary.size > 0 && `(${selectedFromLibrary.size})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
