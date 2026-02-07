'use client'

import { useEffect, useState } from 'react'
import { getConversations, Conversation } from '@/lib/supabase'

interface Props {
  userId: string
  selectedChat: string | null
  onSelectChat: (id: string) => void
}

export function ChatList({ userId, selectedChat, onSelectChat }: Props) {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations()
  }, [userId])

  async function loadConversations() {
    const { data, error } = await getConversations(userId)
    if (data) setConversations(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Cargando...</div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-gray-500">
        <p>No hay conversaciones</p>
        <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          Nueva conversación
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelectChat(conv.id)}
          className={`w-full p-4 flex items-center gap-3 hover:bg-gray-800 transition-colors ${
            selectedChat === conv.id ? 'bg-gray-800' : ''
          }`}
        >
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold">
            {conv.name?.[0] || conv.type[0].toUpperCase()}
          </div>
          
          {/* Info */}
          <div className="flex-1 text-left">
            <h3 className="text-white font-medium">
              {conv.name || `Chat ${conv.type}`}
            </h3>
            <p className="text-sm text-gray-400 truncate">
              {conv.messages?.[0]?.content || 'Sin mensajes'}
            </p>
          </div>

          {/* Time */}
          <span className="text-xs text-gray-500">
            {conv.last_message_at 
              ? new Date(conv.last_message_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
              : ''
            }
          </span>
        </button>
      ))}
    </div>
  )
}
