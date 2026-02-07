'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: string
  isBot?: boolean
}

// Mensajes mock iniciales
const INITIAL_MESSAGES: Record<string, Message[]> = {
  'conv-1': [
    { id: '1', senderId: 'user-angel', senderName: 'Ángel', content: '¡Buenas! ¿Cómo va el proyecto?', timestamp: '14:00' },
    { id: '2', senderId: 'user-kike', senderName: 'Kike', content: 'Genial, Tanke está terminando el chat', timestamp: '14:01' },
    { id: '3', senderId: 'bot-tanke', senderName: 'Tanke', content: 'Listo el MVP 🚀', timestamp: '14:02', isBot: true },
  ],
  'conv-2': [
    { id: '1', senderId: 'user-angel', senderName: 'Ángel', content: 'Revisando el código...', timestamp: '14:30' },
  ],
  'conv-3': [
    { id: '1', senderId: 'user-kike', senderName: 'Kike', content: 'Perfecto, adelante', timestamp: '13:15' },
  ],
  'conv-4': [
    { id: '1', senderId: 'bot-leo', senderName: 'Leo AI', content: 'He estructurado el proyecto siguiendo el protocolo ✅', timestamp: '12:00', isBot: true },
  ],
  'conv-5': [
    { id: '1', senderId: 'bot-tanke', senderName: 'Tanke', content: 'Schema SQL listo. 10 tablas creadas.', timestamp: '11:45', isBot: true },
  ],
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Cargar mensajes mock
    setMessages(INITIAL_MESSAGES[conversationId] || [])
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim()) return

    const msg: Message = {
      id: Date.now().toString(),
      senderId: userId,
      senderName: userName,
      content: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      isBot: userId.startsWith('bot-'),
    }

    setMessages((prev) => [...prev, msg])
    setNewMessage('')
  }

  function isOwnMessage(msg: Message) {
    return msg.senderId === userId
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
          <p className="text-xs text-gray-400">En línea</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${isOwnMessage(msg) ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                isOwnMessage(msg)
                  ? 'bg-green-600 text-white rounded-br-sm'
                  : msg.isBot
                  ? 'bg-purple-600 text-white rounded-bl-sm'
                  : 'bg-gray-700 text-white rounded-bl-sm'
              }`}
            >
              {!isOwnMessage(msg) && (
                <p className={`text-xs mb-1 font-medium ${msg.isBot ? 'text-purple-300' : 'text-green-300'}`}>
                  {msg.senderName} {msg.isBot && '🤖'}
                </p>
              )}
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <p className={`text-xs mt-1 ${isOwnMessage(msg) ? 'text-green-200' : 'text-gray-400'}`}>
                {msg.timestamp}
              </p>
            </div>
          </div>
        ))}
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
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </>
  )
}
