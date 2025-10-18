'use client'

import { useState, useEffect } from 'react'
import { FiArrowLeft, FiImage } from 'react-icons/fi'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { toast } from 'react-hot-toast'

export default function MobileCreatePostPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [content, setContent] = useState('')
  const [platforms, setPlatforms] = useState<('threads' | 'instagram')[]>([])
  const [connectedPlatforms, setConnectedPlatforms] = useState<{
    threads: { connected: boolean; username: string; profilePicture: string }
    instagram: { connected: boolean; username: string; profilePicture: string }
  }>({
    threads: { connected: false, username: '', profilePicture: '' },
    instagram: { connected: false, username: '', profilePicture: '' }
  })
  const [loadingPlatforms, setLoadingPlatforms] = useState(true)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    checkConnectedPlatforms()
    
    // Prefill from URL params
    const date = searchParams.get('date')
    const time = searchParams.get('time')
    if (date) setScheduledDate(date)
    if (time) setScheduledTime(time)
  }, [searchParams])

  const checkConnectedPlatforms = async () => {
    setLoadingPlatforms(true)
    try {
      const response = await axios.get('/api/accounts')
      const { threads, instagram } = response.data

      const connected = {
        threads: {
          connected: threads.connected,
          username: threads.username || '',
          profilePicture: threads.profile_picture_url || ''
        },
        instagram: {
          connected: instagram.connected,
          username: instagram.username || '',
          profilePicture: instagram.profile_picture_url || ''
        }
      }
      
      setConnectedPlatforms(connected)
      
      if (connected.threads.connected) {
        setPlatforms(['threads'])
      } else if (connected.instagram.connected) {
        setPlatforms(['instagram'])
      }
    } catch (error) {
      console.error('Failed to check platforms:', error)
      toast.error('Failed to load platforms')
    } finally {
      setLoadingPlatforms(false)
    }
  }

  const handlePlatformToggle = (platform: 'threads' | 'instagram') => {
    setPlatforms(prev => {
      if (prev.includes(platform)) {
        return prev.filter(p => p !== platform)
      } else {
        return [...prev, platform]
      }
    })
  }

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (files.length + mediaUrls.length > 10) {
      toast.error('Max 10 images')
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
      
      setMediaUrls([...mediaUrls, ...uploadedUrls])
      toast.success(`${files.length} uploaded`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!content.trim() && mediaUrls.length === 0) {
      toast.error('Add content or image')
      return
    }

    if (platforms.includes('instagram') && mediaUrls.length === 0) {
      toast.error('Instagram needs image')
      return
    }

    if (platforms.length === 0) {
      toast.error('Select platform')
      return
    }

    const hasSchedule = scheduledDate && scheduledTime
    if (hasSchedule) {
      const scheduleDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
      const now = new Date()
      
      if (scheduleDateTime <= now) {
        toast.error('Schedule must be future')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const scheduledAt = hasSchedule 
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null

      for (const platform of platforms) {
        await axios.post('/api/posts', {
          content: content.trim(),
          platform: platform,
          scheduledAt,
          publishImmediately: !scheduledAt,
          mediaUrls: mediaUrls
        })
      }

      const platformNames = platforms.map(p => p === 'instagram' ? 'Instagram' : 'Threads').join(' & ')
      toast.success(hasSchedule ? `Scheduled for ${platformNames}` : `Posted to ${platformNames}`)
      
      router.push('/posts')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const charCount = content.length
  const maxChars = 500

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header - COMPACT */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 py-2">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="p-1.5 -ml-1 hover:bg-gray-100 rounded-lg active:bg-gray-200"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          
          <h1 className="text-base font-bold text-gray-900">Create Post</h1>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!content.trim() && mediaUrls.length === 0) || platforms.length === 0}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '...' : (scheduledDate && scheduledTime) ? 'Schedule' : 'Post'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Platforms - ICON ONLY */}
        {loadingPlatforms ? (
          <div className="p-2 text-center text-xs text-gray-400">Loading...</div>
        ) : (
          <div className="bg-white px-3 py-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-medium">Post to:</span>
              {connectedPlatforms.threads.connected && (
                <button
                  onClick={() => handlePlatformToggle('threads')}
                  className={`p-0.5 rounded-full transition-all ${
                    platforms.includes('threads')
                      ? 'ring-2 ring-black ring-offset-2'
                      : 'ring-2 ring-gray-300 ring-offset-1 opacity-50'
                  }`}
                >
                  {connectedPlatforms.threads.profilePicture ? (
                    <img 
                      src={connectedPlatforms.threads.profilePicture} 
                      alt="Threads" 
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-black"></div>
                  )}
                </button>
              )}
              
              {connectedPlatforms.instagram.connected && (
                <button
                  onClick={() => handlePlatformToggle('instagram')}
                  className={`p-0.5 rounded-full transition-all ${
                    platforms.includes('instagram')
                      ? 'ring-2 ring-purple-500 ring-offset-2'
                      : 'ring-2 ring-gray-300 ring-offset-1 opacity-50'
                  }`}
                >
                  {connectedPlatforms.instagram.profilePicture ? (
                    <img 
                      src={connectedPlatforms.instagram.profilePicture} 
                      alt="Instagram" 
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500"></div>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Text Area - COMPACT */}
        <div className="bg-white px-3 py-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full text-[15px] text-gray-900 placeholder-gray-400 border-none focus:outline-none resize-none min-h-[140px]"
            maxLength={maxChars}
            autoFocus
          />
          <div className="text-right">
            <span className={`text-xs font-medium ${charCount > maxChars * 0.9 ? 'text-red-600' : 'text-gray-500'}`}>
              {charCount}/{maxChars}
            </span>
          </div>
        </div>

        {/* Media Preview - COMPACT */}
        {mediaUrls.length > 0 && (
          <div className="bg-white px-3 pb-3">
            <div className="grid grid-cols-3 gap-1.5">
              {mediaUrls.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveMedia(index)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/90 text-white rounded-full hover:bg-black flex items-center justify-center text-sm font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule - COMPACT */}
        <div className="bg-white px-3 py-3 mt-1 border-t border-gray-200">
          <label className="text-xs text-gray-600 font-bold mb-2 block">Schedule (Optional)</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={getTodayDate()}
              className="w-full px-2 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-2 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Add Photo Button - COMPACT */}
        <div className="bg-white px-3 py-3 mt-1">
          <label className="flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 cursor-pointer text-sm font-bold text-gray-700">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleMediaSelect}
              className="hidden"
              disabled={uploading}
            />
            <FiImage className="w-4 h-4" />
            {uploading ? 'Uploading...' : `Add Photos (${mediaUrls.length}/10)`}
          </label>
        </div>
      </div>
    </div>
  )
}
