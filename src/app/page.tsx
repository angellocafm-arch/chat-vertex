'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Usuarios predefinidos
const USERS: Record<string, { id: string; name: string; isBot: boolean }> = {
  angel: { id: 'user-angel', name: 'Ángel', isBot: false },
  kike: { id: 'user-kike', name: 'Kike', isBot: false },
  tanke: { id: 'bot-tanke', name: 'Tanke', isBot: true },
  leo: { id: 'bot-leo', name: 'Leo AI', isBot: true },
}

interface Message {
  id: string
  sender_id: string
  sender_name: string
  content: string
  is_bot: boolean
  created_at: string
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const userParam = searchParams.get('u') || searchParams.get('user')
  
  const [user, setUser] = useState<{ id: string; name: string; isBot: boolean } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Identificar usuario por URL
  useEffect(() => {
    if (userParam && USERS[userParam.toLowerCase()]) {
      setUser(USERS[userParam.toLowerCase()])
    }
    setLoading(false)
  }, [userParam])

  // Cargar mensajes y suscribirse
  useEffect(() => {
    if (!user) return

    loadMessages()
    
    const channel = supabase
      .channel('cv-chat-main')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cv_messages',
          filter: 'conversation_id=eq.main'
        },
        (payload) => {
          const msg = payload.new as Message
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('cv_messages')
      .select('*')
      .eq('conversation_id', 'main')
      .order('created_at', { ascending: true })
      .limit(100)
    
    if (data) setMessages(data)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !user || sending) return

    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    const { error } = await supabase
      .from('cv_messages')
      .insert({
        conversation_id: 'main',
        sender_id: user.id,
        sender_name: user.name,
        content,
        is_bot: user.isBot
      })

    if (error) {
      console.error('Error:', error)
      setNewMessage(content)
    }
    setSending(false)
    inputRef.current?.focus()
  }

  function formatTime(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }

  function isOwn(msg: Message) {
    return msg.sender_id === user?.id
  }

  // Pantalla de selección de usuario
  if (!user && !loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4" style={{ background: '#0B141A' }}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Chat Vertex</h1>
          <p className="text-[#8696A0]">Selecciona tu usuario</p>
        </div>
        <div className="grid grid-cols-2 gap-4 max-w-md w-full">
          {Object.entries(USERS).map(([key, u]) => (
            <a
              key={key}
              href={`?u=${key}`}
              className="p-6 rounded-xl text-center transition-all hover:scale-105"
              style={{ background: '#1F2C34' }}
            >
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl mb-3 ${
                u.isBot ? 'bg-purple-600' : 'bg-[#25D366]'
              }`}>
                {u.isBot ? '🤖' : u.name[0]}
              </div>
              <p className="text-white font-medium">{u.name}</p>
              <p className="text-xs text-[#8696A0] mt-1">{u.isBot ? 'Bot' : 'Humano'}</p>
            </a>
          ))}
        </div>
        <p className="text-[#667781] text-sm mt-8">
          O usa directamente: /?u=angel, /?u=kike, /?u=tanke, /?u=leo
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#0B141A' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#25D366]"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0B141A' }}>
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3" style={{ background: '#1F2C34', borderBottom: '1px solid #2A3942' }}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
          user?.isBot ? 'bg-purple-600' : 'bg-[#25D366]'
        }`}>
          {user?.isBot ? '🤖' : user?.name[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-white font-medium">Chat Vertex</h1>
          <p className="text-xs text-[#8696A0]">Conectado como {user?.name}</p>
        </div>
        <a href="/" className="text-[#8696A0] hover:text-white text-sm">Cambiar</a>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-[#8696A0]">
            <p className="text-4xl mb-4">💬</p>
            <p>No hay mensajes todavía</p>
            <p className="text-sm mt-2">¡Escribe algo!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${isOwn(msg) ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-3 py-2 ${
                  isOwn(msg) 
                    ? 'rounded-2xl rounded-br-sm' 
                    : 'rounded-2xl rounded-bl-sm'
                }`}
                style={{ 
                  background: isOwn(msg) ? '#005C4B' : msg.is_bot ? '#4C1D95' : '#1F2C34'
                }}
              >
                {!isOwn(msg) && (
                  <p className={`text-xs font-medium mb-1 ${msg.is_bot ? 'text-purple-300' : 'text-[#25D366]'}`}>
                    {msg.sender_name} {msg.is_bot && '🤖'}
                  </p>
                )}
                <p className="text-white text-[15px] leading-5 whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
                <p className="text-[11px] text-[#667781] text-right mt-1">
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3" style={{ background: '#1F2C34', borderTop: '1px solid #2A3942' }}>
        <div className="flex items-end gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje"
            disabled={sending}
            className="flex-1 px-4 py-2 rounded-full text-white placeholder-[#667781] focus:outline-none"
            style={{ background: '#2A3942', fontSize: '16px' }}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
            style={{ background: newMessage.trim() ? '#25D366' : '#2A3942' }}
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
