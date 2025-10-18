'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'

interface DisconnectButtonProps {
  platform: 'threads' | 'instagram'
  label?: string
}

export default function DisconnectButton({ platform, label = 'Disconnect' }: DisconnectButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${platform === 'threads' ? 'Threads' : 'Instagram'}?`)) {
      return
    }

    setLoading(true)
    try {
      await axios.post(`/api/${platform}/disconnect`)
      toast.success(`${platform === 'threads' ? 'Threads' : 'Instagram'} disconnected`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to disconnect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDisconnect}
      disabled={loading}
      className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Disconnecting...' : label}
    </button>
  )
}
