'use client'

import { useState } from 'react'

// Conversaciones mock para pruebas
const MOCK_CONVERSATIONS = [
  { id: 'conv-1', name: 'Grupo Vertex', type: 'group', lastMessage: '¡Hola equipo!', time: 'Ahora' },
  { id: 'conv-2', name: 'Ángel', type: 'direct', lastMessage: 'Revisando el código...', time: '14:30' },
  { id: 'conv-3', name: 'Kike', type: 'direct', lastMessage: 'Perfecto, adelante', time: '13:15' },
  { id: 'conv-4', name: 'Leo AI', type: 'bot', lastMessage: 'Proyecto estructurado ✅', time: '12:00' },
  { id: 'conv-5', name: 'Tanke', type: 'bot', lastMessage: 'Schema SQL listo', time: '11:45' },
]

interface Props {
  userId: string
  selectedChat: string | null
  onSelectChat: (id: string) => void
}

export function ChatList({ userId, selectedChat, onSelectChat }: Props) {
  const conversations = MOCK_CONVERSATIONS

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
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
            conv.type === 'bot' 
              ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
              : conv.type === 'group'
              ? 'bg-gradient-to-br from-green-500 to-blue-500'
              : 'bg-gradient-to-br from-blue-500 to-cyan-500'
          }`}>
            {conv.type === 'bot' ? '🤖' : conv.name[0]}
          </div>
          
          {/* Info */}
          <div className="flex-1 text-left">
            <h3 className="text-white font-medium flex items-center gap-2">
              {conv.name}
              {conv.type === 'bot' && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">Bot</span>}
            </h3>
            <p className="text-sm text-gray-400 truncate">{conv.lastMessage}</p>
          </div>

          {/* Time */}
          <span className="text-xs text-gray-500">{conv.time}</span>
        </button>
      ))}
    </div>
  )
}
