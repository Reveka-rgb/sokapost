'use client'

import { useState, useEffect } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiArrowLeft, FiCheck, FiX, FiPower } from 'react-icons/fi'
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
        // Update existing
        await axios.put(`/api/auto-reply/keywords/${editingId}`, formData)
        toast.success('✅ Keyword updated!')
      } else {
        // Create new
        await axios.post('/api/auto-reply/keywords', formData)
        toast.success('✅ Keyword created!')
      }

      // Reset form
      setFormData({
        keyword: '',
        replyText: '',
        enabled: true,
        priority: 0
      })
      setShowForm(false)
      setEditingId(null)
      
      // Refresh list
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
      toast.success(enabled ? '✅ Keyword enabled' : '⏸️ Keyword disabled')
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

    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 30) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/auto-reply"
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Keyword Management</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              Manage auto-reply keywords dan responses
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
        
        {/* LEFT COLUMN - Form & Settings */}
        <div className="space-y-4 overflow-y-auto pr-2">
          
          {/* Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {editingId ? 'Edit Keyword' : 'Add New Keyword'}
              </h3>
              {editingId && (
                <button
                  onClick={cancelForm}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Cancel editing"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Keyword */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Keyword(s)
                </label>
                <input
                  type="text"
                  value={formData.keyword}
                  onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                  placeholder="harga, price, berapa"
                  className="w-full px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pisahkan dengan koma untuk variants
                </p>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Priority
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-2 py-1.5 text-xs text-gray-900 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Higher = checked first
                </p>
              </div>
            </div>

            {/* Reply Text */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Reply Text
              </label>
              <textarea
                value={formData.replyText}
                onChange={(e) => setFormData({ ...formData, replyText: e.target.value })}
                placeholder="Harga mulai dari 25k kak! Mau order?"
                className="w-full h-20 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-transparent resize-none"
              />
            </div>

            {/* Enabled */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700">Enabled</p>
                <p className="text-xs text-gray-500 mt-0.5">Aktifkan keyword ini</p>
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
            <div className="flex justify-end gap-2 pt-2">
              {editingId && (
                <button
                  onClick={cancelForm}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSubmit}
                className="px-3 py-1.5 text-xs font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              >
                {editingId ? <FiCheck className="w-3 h-3" /> : <FiPlus className="w-3 h-3" />}
                {editingId ? 'Update' : 'Add Keyword'}
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-blue-900 mb-2">How Keywords Work</h4>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Keyword matching is case-insensitive</li>
              <li>Multiple variants: separate dengan koma (e.g., "harga, price, berapa")</li>
              <li>Higher priority keywords are checked first</li>
              <li>First match wins - no multiple replies untuk satu message</li>
            </ul>
          </div>

        </div>

        {/* RIGHT COLUMN - Keywords List */}
        <div className="space-y-4 overflow-y-auto pr-2">
          
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Saved Keywords ({keywords.length})
            </h3>
          </div>

          {/* Keywords List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
            </div>
          ) : keywords.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-xs text-gray-500 mb-3">Belum ada keyword. Tambahkan di form sebelah kiri!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {keywords.map((keyword) => (
                <div
                  key={keyword.id}
                  className={`bg-white rounded-lg border-2 p-4 hover:shadow-sm transition-all ${
                    editingId === keyword.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Keyword */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          {keyword.keyword}
                        </span>
                        {!keyword.enabled && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            Disabled
                          </span>
                        )}
                        {keyword.priority > 0 && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                            P{keyword.priority}
                          </span>
                        )}
                      </div>

                      {/* Reply Text */}
                      <p className="text-xs text-gray-700 mb-2 bg-gray-50 p-2 rounded-lg border border-gray-200 leading-relaxed">
                        {keyword.replyText}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>Used: {keyword.usedCount}x</span>
                        <span>Last: {formatDate(keyword.lastUsedAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 ml-3">
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggle(keyword.id, !keyword.enabled)}
                        className={`p-1.5 border rounded-lg transition-colors ${
                          keyword.enabled
                            ? 'border-green-500 text-gray-900 hover:bg-gray-50'
                            : 'border-gray-300 text-gray-400 hover:bg-gray-50'
                        }`}
                        title={keyword.enabled ? 'Click to disable' : 'Click to enable'}
                      >
                        <FiPower className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleEdit(keyword)}
                        className={`p-1.5 border rounded-lg transition-colors ${
                          editingId === keyword.id
                            ? 'border-blue-500 bg-blue-50 text-gray-900'
                            : 'border-gray-300 text-gray-900 hover:bg-gray-50'
                        }`}
                        title="Edit"
                      >
                        <FiEdit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(keyword.id)}
                        className="p-1.5 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
