'use client'

import { useState } from 'react'
import { FiX, FiZap } from 'react-icons/fi'
import axios from 'axios'
import { toast } from 'react-hot-toast'

interface AIAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (content: string) => void
}

export default function AIAssistantModal({ isOpen, onClose, onInsert }: AIAssistantModalProps) {
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')

  if (!isOpen) return null

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    try {
      setGenerating(true)
      const response = await axios.post('/api/ai/generate', {
        prompt: prompt
      })
      
      setGeneratedContent(response.data.content)
      toast.success('✨ Content generated!')
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to generate content'
      toast.error(errorMsg)
      console.error('AI generation failed:', errorMsg)
    } finally {
      setGenerating(false)
    }
  }

  const handleInsert = () => {
    if (generatedContent) {
      onInsert(generatedContent)
      toast.success('Content inserted!')
    }
  }

  const handleRewrite = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt first')
      return
    }

    try {
      setGenerating(true)
      const response = await axios.post('/api/ai/generate', {
        prompt: prompt + '\n\nRewrite this in a different style while keeping the main message.'
      })
      
      setGeneratedContent(response.data.content)
      toast.success('🔄 Content rewritten!')
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to rewrite content'
      toast.error(errorMsg)
      console.error('AI rewrite failed:', errorMsg)
    } finally {
      setGenerating(false)
    }
  }

  const handleMoreIdeas = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt first')
      return
    }

    try {
      setGenerating(true)
      const response = await axios.post('/api/ai/generate', {
        prompt: prompt + '\n\nGive me a completely different creative approach to this topic.'
      })
      
      setGeneratedContent(response.data.content)
      toast.success('💡 New idea generated!')
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to generate new idea'
      toast.error(errorMsg)
      console.error('AI more ideas failed:', errorMsg)
    } finally {
      setGenerating(false)
    }
  }

  const handleClear = () => {
    setPrompt('')
    setGeneratedContent('')
  }

  return (
    <div 
      className="w-[400px] bg-gray-50 flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* AI Header */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <FiZap className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">AI Assistant</h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <FiX className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* AI Content */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <label className="text-sm font-medium text-gray-700 mb-2">
          Tentang apa yang ingin kamu tulis?
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Contoh: Bingung mau kasih contoh apa."
          className="w-full h-32 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none mb-3"
        />
        
        <p className="text-xs text-gray-500 mb-3">
          <strong>Tips:</strong> Sertakan poin-poin penting, target audiens, dan hasil yang diinginkan
        </p>

        <button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="w-full px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Membuat konten...
            </>
          ) : (
            <>
              <FiZap className="w-4 h-4" />
              Buat Konten
            </>
          )}
        </button>

        {/* Generated Content */}
        {generatedContent && (
          <div className="mt-4 space-y-3">
            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-900">Konten Yang Dibuat:</span>
                <button
                  onClick={handleClear}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Hapus
                </button>
              </div>
              <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{generatedContent}</p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRewrite}
                disabled={generating}
                className="px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔄 Tulis Ulang
              </button>
              <button
                onClick={handleMoreIdeas}
                disabled={generating}
                className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💡 Ide Lain
              </button>
            </div>

            {/* Insert Button */}
            <button
              onClick={handleInsert}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              ✓ Masukkan ke Post
            </button>
          </div>
        )}
      </div>

      {/* AI Footer */}
      <div className="px-6 py-3 border-t border-gray-200 bg-purple-50">
        <div className="flex items-start gap-2">
          <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FiZap className="text-white w-2.5 h-2.5" />
          </div>
          <p className="text-xs text-purple-900">
            <strong>Tip:</strong> Jelaskan audiens, gaya bahasa, dan pesan utama dengan spesifik untuk hasil yang lebih baik.
          </p>
        </div>
      </div>
    </div>
  )
}
