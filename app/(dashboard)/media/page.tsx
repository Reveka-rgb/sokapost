'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import Image from 'next/image'
import { FiImage, FiTrash2, FiCheckCircle, FiCopy } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface MediaItem {
  url: string
  filename: string
  usedInPosts: number
  firstUsedAt: string
}

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadMedia()
  }, [])

  const loadMedia = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/media-library')
      setMedia(response.data.media)
    } catch (error) {
      console.error('Failed to load media:', error)
      toast.error('Failed to load media library')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (url: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(url)) {
      newSelected.delete(url)
    } else {
      newSelected.add(url)
    }
    setSelectedItems(newSelected)
  }

  const copyUrl = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
    navigator.clipboard.writeText(fullUrl)
    toast.success('URL copied to clipboard!')
  }

  const deleteMedia = async (urls: string[]) => {
    const mediaToDelete = media.filter(m => urls.includes(m.url))
    const usedMedia = mediaToDelete.filter(m => m.usedInPosts > 0)
    
    if (usedMedia.length > 0) {
      toast.error(
        `Cannot delete ${usedMedia.length} ${usedMedia.length === 1 ? 'item' : 'items'} that ${usedMedia.length === 1 ? 'is' : 'are'} used in posts`,
        { duration: 4000 }
      )
      return
    }

    const confirmMessage = urls.length === 1
      ? 'Delete this media file? This action cannot be undone.'
      : `Delete ${urls.length} media files? This action cannot be undone.`
    
    if (!confirm(confirmMessage)) return

    try {
      setDeleting(true)
      const response = await axios.delete('/api/media-library', {
        data: { urls }
      })

      if (response.data.deletedCount > 0) {
        toast.success(
          `${response.data.deletedCount} ${response.data.deletedCount === 1 ? 'file' : 'files'} deleted successfully`
        )
        
        // Show errors if any
        if (response.data.errorCount > 0) {
          response.data.errors.forEach((error: string) => {
            toast.error(error, { duration: 4000 })
          })
        }
        
        // Clear selection and reload
        setSelectedItems(new Set())
        loadMedia()
      } else if (response.data.errorCount > 0) {
        response.data.errors.forEach((error: string) => {
          toast.error(error, { duration: 4000 })
        })
      }
    } catch (error: any) {
      console.error('Failed to delete media:', error)
      toast.error(error.response?.data?.error || 'Failed to delete media')
    } finally {
      setDeleting(false)
    }
  }

  const getImageUrl = (url: string) => {
    // Convert /uploads/ to /api/media/ for proper serving
    if (url.startsWith('/uploads/')) {
      const filename = url.split('/').pop()
      return `/api/media/${filename}`
    }
    return url
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading media library...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 md:mb-6 flex-shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Media</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          {media.length} {media.length === 1 ? 'item' : 'items'}
          {selectedItems.size > 0 && ` • ${selectedItems.size} selected`}
        </p>
      </div>

      {media.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-8 md:p-12 text-center">
          <FiImage className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">No media yet</h3>
          <p className="text-sm text-gray-600 mb-4">
            Upload images when creating posts
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 pb-4">
          {media.map((item) => (
            <div
              key={item.url}
              className={`group relative bg-white rounded-lg border-2 overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                selectedItems.has(item.url)
                  ? 'border-blue-500 ring-2 ring-blue-500'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => toggleSelect(item.url)}
            >
              {/* Selection indicator */}
              {selectedItems.has(item.url) && (
                <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 z-10 bg-blue-600 text-white rounded-full p-0.5 md:p-1">
                  <FiCheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              )}

              {/* Image */}
              <div className="aspect-square relative bg-gray-100">
                <Image
                  src={getImageUrl(item.url)}
                  alt={item.filename}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                />
              </div>

              {/* Info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 md:p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-[10px] md:text-xs truncate font-medium mb-0.5 md:mb-1">
                  {item.filename}
                </p>
                <p className="text-white/80 text-xs">
                  Used in {item.usedInPosts} {item.usedInPosts === 1 ? 'post' : 'posts'}
                </p>
              </div>

              {/* Actions */}
              <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    copyUrl(item.url)
                  }}
                  className="bg-white text-gray-700 rounded-full p-1.5 md:p-2 shadow-lg hover:bg-gray-100 transition-colors"
                  title="Copy URL"
                >
                  <FiCopy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteMedia([item.url])
                  }}
                  disabled={deleting || item.usedInPosts > 0}
                  className={`bg-white rounded-full p-1.5 md:p-2 shadow-lg transition-colors ${
                    item.usedInPosts > 0
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                  title={item.usedInPosts > 0 ? 'Cannot delete - used in posts' : 'Delete'}
                >
                  <FiTrash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Floating action bar when items selected */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white rounded-full shadow-2xl px-4 md:px-6 py-3 md:py-4 flex items-center gap-2 md:gap-4 z-50">
          <span className="text-sm md:text-base font-semibold">
            {selectedItems.size} selected
          </span>
          <div className="w-px h-5 md:h-6 bg-gray-600" />
          <button
            onClick={() => {
              const urls = Array.from(selectedItems)
              navigator.clipboard.writeText(urls.join('\n'))
              toast.success(`${urls.length} URL(s) copied!`)
            }}
            className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors text-sm md:text-base"
          >
            <FiCopy className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Copy URLs</span>
            <span className="sm:hidden">Copy</span>
          </button>
          <button
            onClick={() => deleteMedia(Array.from(selectedItems))}
            disabled={deleting}
            className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
          >
            <FiTrash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <button
            onClick={() => setSelectedItems(new Set())}
            className="px-4 py-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
