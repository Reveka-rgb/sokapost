'use client'

import { useState, useEffect } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiArrowLeft, FiCheck, FiX, FiPower, FiInfo } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Keyword {
  id: string
  keyword: string
  replyText: string
  enabled: boolean
  priority: number
  usedCount: number
  lastUsedAt: string | null
  createdAt: string
}

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    keyword: '',
    replyText: '',
    enabled: true,
    priority: 0
  })

  useEffect(() => {
    fetchKeywords()
  }, [])

  const fetchKeywords = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/auto-reply/keywords')
      setKeywords(response.data.keywords || [])
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load keywords')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.keyword.trim() || !formData.replyText.trim()) {
      toast.error('Keyword dan reply text harus diisi!')
      return
    }

    try {
      if (editingId) {
        await axios.put(`/api/auto-reply/keywords/${editingId}`, formData)
        toast.success('✅ Keyword updated!')
      } else {
        await axios.post('/api/auto-reply/keywords', formData)
        toast.success('✅ Keyword created!')
      }

      setFormData({
        keyword: '',
        replyText: '',
        enabled: true,
        priority: 0
      })
      setShowForm(false)
      setEditingId(null)
      
      fetchKeywords()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save keyword')
    }
  }

  const handleEdit = (keyword: Keyword) => {
    setFormData({
      keyword: keyword.keyword,
      replyText: keyword.replyText,
      enabled: keyword.enabled,
      priority: keyword.priority
    })
    setEditingId(keyword.id)
    setShowForm(true)
    
    // Scroll to top on mobile to show form
    if (window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin mau hapus keyword ini?')) return

    try {
      await axios.delete(`/api/auto-reply/keywords/${id}`)
      toast.success('🗑️ Keyword deleted!')
      fetchKeywords()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete keyword')
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await axios.put(`/api/auto-reply/keywords/${id}`, { enabled })
      toast.success(enabled ? '✅ Enabled' : '⏸️ Disabled')
      fetchKeywords()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle keyword')
    }
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      keyword: '',
      replyText: '',
      enabled: true,
      priority: 0
    })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Baru saja'
    if (diffMins < 60) return `${diffMins}m lalu`
    if (diffHours < 24) return `${diffHours}h lalu`
    if (diffDays < 30) return `${diffDays}d lalu`
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-3 md:mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/auto-reply"
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-bold text-gray-900">Keywords</h1>
            <p className="text-xs text-gray-600">
              Manage auto-reply keywords
            </p>
          </div>
        </div>
        
        {/* Divider - Mobile Only */}
        <div className="md:hidden border-t border-gray-200 mb-3"></div>
        
        {/* Add Button - Mobile Only */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="md:hidden w-full px-3 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <FiPlus className="w-4 h-4" />
            Add New Keyword
          </button>
        )}
      </div>

      {/* 2 Column Layout for Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        {/* LEFT COLUMN - Form (Desktop always visible, Mobile collapsible) */}
        <div className={`${showForm ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 space-y-3 md:sticky md:top-4 md:max-h-[calc(100vh-120px)] md:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                {editingId ? 'Edit Keyword' : 'Add New Keyword'}
              </h3>
              <button
                onClick={cancelForm}
                className="md:hidden p-1 hover:bg-gray-100 rounded-md transition-colors"
                title="Close"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* Keyword & Priority */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Keyword(s)
                </label>
                <input
                  type="text"
                  value={formData.keyword}
                  onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                  placeholder="harga, price, berapa"
                  className="w-full px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-transparent"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Pisahkan dengan koma
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-2 py-1.5 text-xs text-gray-900 border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-transparent"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Higher first
                </p>
              </div>
            </div>

            {/* Reply Text */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reply Text
              </label>
              <textarea
                value={formData.replyText}
                onChange={(e) => setFormData({ ...formData, replyText: e.target.value })}
                placeholder="Harga mulai dari 25k kak!"
                className="w-full h-20 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-transparent resize-none"
              />
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700">Enabled</p>
                <p className="text-[10px] text-gray-500">Aktifkan keyword ini</p>
              </div>
              <button
                onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  formData.enabled ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    formData.enabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={cancelForm}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-black text-white rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
              >
                {editingId ? <FiCheck className="w-3 h-3" /> : <FiPlus className="w-3 h-3" />}
                {editingId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
        
        {/* RIGHT COLUMN - Keywords List */}
        <div className="space-y-3">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FiInfo className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-blue-900 mb-1">Cara Kerja Keywords</h4>
                <ul className="text-[10px] text-blue-800 space-y-0.5 leading-relaxed">
                  <li>• Tidak case-sensitive (HARGA = harga)</li>
                  <li>• Variants: pisahkan dengan koma (harga, price, berapa)</li>
                  <li>• Priority tinggi dicek duluan</li>
                  <li>• Match pertama yang akan direply</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Keywords List Header */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Keywords ({keywords.length})
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
            </div>
          ) : keywords.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-xs text-gray-500">Belum ada keyword. Isi form di sebelah kiri untuk mulai!</p>
            </div>
          ) : (
            <div className="space-y-2">
          {keywords.map((keyword) => (
            <div
              key={keyword.id}
              className={`bg-white rounded-lg border-2 p-3 transition-all ${
                editingId === keyword.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              {/* Header: Badges & Actions */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    {keyword.keyword}
                  </span>
                  {!keyword.enabled && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full">
                      Disabled
                    </span>
                  )}
                  {keyword.priority > 0 && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-medium rounded-full">
                      P{keyword.priority}
                    </span>
                  )}
                </div>

                {/* Actions - Compact */}
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleToggle(keyword.id, !keyword.enabled)}
                    className={`p-1 border rounded-md transition-colors ${
                      keyword.enabled
                        ? 'border-green-500 text-green-600 hover:bg-green-50'
                        : 'border-gray-300 text-gray-400 hover:bg-gray-50'
                    }`}
                    title={keyword.enabled ? 'Disable' : 'Enable'}
                  >
                    <FiPower className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => handleEdit(keyword)}
                    className={`p-1 border rounded-md transition-colors ${
                      editingId === keyword.id
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Edit"
                  >
                    <FiEdit2 className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => handleDelete(keyword.id)}
                    className="p-1 border border-gray-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <FiTrash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Reply Text */}
              <p className="text-sm text-gray-900 mb-2 bg-gray-50 p-2.5 rounded-md border border-gray-200 leading-relaxed font-medium">
                {keyword.replyText}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                <span>Used: <strong className="text-gray-700">{keyword.usedCount}x</strong></span>
                <span className="text-gray-300">•</span>
                <span>Last: <strong className="text-gray-700">{formatDate(keyword.lastUsedAt)}</strong></span>
              </div>
            </div>
          ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
