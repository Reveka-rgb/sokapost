'use client'

import { useState, useEffect } from 'react'
import { FiMessageSquare, FiSend, FiRefreshCw } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

interface Conversation {
  id: string
  participants: {
    id: string
    username: string
    profile_pic?: string
  }[]
  updated_time: string
  message_count: number
}

interface Message {
  id: string
  created_time: string
  from: {
    id: string
    username?: string
  }
  message?: string
  attachments?: any
}

export default function InstagramMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)

  // Disabled - Coming Soon
  // useEffect(() => {
  //   fetchConversations()
  // }, [])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/instagram/conversations')
      setConversations(response.data.conversations || [])
    } catch (error: any) {
      console.error('Error fetching conversations:', error)
      toast.error(error.response?.data?.error || 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true)
      const response = await axios.get(`/api/instagram/conversations/${conversationId}/messages`)
      setMessages(response.data.messages || [])
    } catch (error: any) {
      console.error('Error fetching messages:', error)
      toast.error(error.response?.data?.error || 'Failed to load messages')
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    fetchMessages(conversation.id)
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || sending) return

    const recipient = selectedConversation.participants[0]
    if (!recipient) {
      toast.error('No recipient found')
      return
    }

    try {
      setSending(true)
      await axios.post('/api/instagram/messages/send', {
        recipientId: recipient.id,
        message: messageText
      })

      await fetchMessages(selectedConversation.id)
      setMessageText('')
      toast.success('Message sent!')
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error(error.response?.data?.error || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const getConversationName = (conversation: Conversation) => {
    const participant = conversation.participants.find(p => p.username)
    return participant?.username || 'Unknown User'
  }

  const getConversationAvatar = (conversation: Conversation) => {
    const participant = conversation.participants.find(p => p.username)
    return participant?.profile_pic
  }

  return (
    <div className="relative">
      {/* Original UI */}
      <div>
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Instagram Messages</h1>
            <p className="text-gray-600 mt-2">Manage your Instagram direct messages</p>
          </div>
          <button
            onClick={fetchConversations}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: 'calc(100vh - 250px)' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Conversations</h2>
              </div>
              
              {loading ? (
                <div className="text-center py-12 text-gray-500">
                  <FiRefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
                  <p>Loading conversations...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FiMessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm mt-1">Messages will appear here</p>
                </div>
              ) : (
                <div>
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {getConversationAvatar(conversation) ? (
                          <img
                            src={getConversationAvatar(conversation)}
                            alt={getConversationName(conversation)}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                            {getConversationName(conversation)[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {getConversationName(conversation)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {conversation.message_count || 0} messages
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Messages View */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                    {getConversationAvatar(selectedConversation) ? (
                      <img
                        src={getConversationAvatar(selectedConversation)}
                        alt={getConversationName(selectedConversation)}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                        {getConversationName(selectedConversation)[0].toUpperCase()}
                      </div>
                    )}
                    <h3 className="font-semibold text-gray-900">
                      {getConversationName(selectedConversation)}
                    </h3>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                    {loadingMessages ? (
                      <div className="text-center py-12 text-gray-500">
                        <FiRefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
                        <p>Loading messages...</p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <FiMessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No messages yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.from.username === getConversationName(selectedConversation)
                                ? 'justify-start'
                                : 'justify-end'
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                message.from.username === getConversationName(selectedConversation)
                                  ? 'bg-white text-gray-900'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              <p className="text-sm">{message.message || '[Media]'}</p>
                              <p className={`text-xs mt-1 ${
                                message.from.username === getConversationName(selectedConversation)
                                  ? 'text-gray-500'
                                  : 'text-blue-100'
                              }`}>
                                {new Date(message.created_time).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        placeholder="Type a message..."
                        disabled={sending}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || sending}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sending ? <FiRefreshCw className="animate-spin" /> : <FiSend />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <FiMessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Select a conversation to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Overlay - Transparan di atas UI */}
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80 backdrop-blur-sm pointer-events-none">
        <h1 className="text-4xl font-bold text-black">Coming Soon</h1>
      </div>
    </div>
  )
}
