'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase, getMessages, sendMessage, subscribeToMessages, Message } from '@/lib/supabase'

const CONV_NAMES: Record<string, string> = {
  'conv-1': 'Grupo Vertex',
  'conv-2': 'Ángel',
  'conv-3': 'Kike',
  'conv-4': 'Leo AI',
  'conv-5': 'Tanke',
}

interface Props {
  conversationId: string
  userId: string
  userName: string
}

export function ChatWindow({ conversationId, userId, userName }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    
    // Suscribirse a nuevos mensajes
    const channel = subscribeToMessages(conversationId, (message) => {
      setMessages((prev) => {
        // Evitar duplicados
        if (prev.find(m => m.id === message.id)) return prev
        return [...prev, message]
      })
    })

    return () => {
      channel.unsubscribe()
    }
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function loadMessages() {
    setLoading(true)
    const { data, error } = await getMessages(conversationId)
    if (data) {
      setMessages(data)
    }
    setLoading(false)
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    const { error } = await sendMessage(
      conversationId,
      userId,
      userName,
      content,
      userId.startsWith('bot-')
    )

    if (error) {
      console.error('Error sending message:', error)
      setNewMessage(content) // Restaurar mensaje si falla
    }
    setSending(false)
  }

  function isOwnMessage(msg: Message) {
    return msg.sender_id === userId
  }

  function formatTime(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString('es', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <>
      {/* Header */}
      <header className="p-4 border-b border-gray-700 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold">
          {CONV_NAMES[conversationId]?.[0] || '?'}
        </div>
        <div>
          <h2 className="text-white font-medium">{CONV_NAMES[conversationId]}</h2>
          <p className="text-xs text-gray-400">
            {loading ? 'Cargando...' : `${messages.length} mensajes`}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay mensajes todavía</p>
            <p className="text-sm mt-2">¡Sé el primero en escribir!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${isOwnMessage(msg) ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  isOwnMessage(msg)
                    ? 'bg-green-600 text-white rounded-br-sm'
                    : msg.is_bot
                    ? 'bg-purple-600 text-white rounded-bl-sm'
                    : 'bg-gray-700 text-white rounded-bl-sm'
                }`}
              >
                {!isOwnMessage(msg) && (
                  <p className={`text-xs mb-1 font-medium ${msg.is_bot ? 'text-purple-300' : 'text-green-300'}`}>
                    {msg.sender_name} {msg.is_bot && '🤖'}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`text-xs mt-1 ${isOwnMessage(msg) ? 'text-green-200' : 'text-gray-400'}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 disabled:opacity-50"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </>
  )
}
