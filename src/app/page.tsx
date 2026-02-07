'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ============================================================
// CHAT VERTEX — Copia exacta del chat privado de WhatsSound
// Adaptado para Next.js web
// ============================================================

// Colores de WhatsSound (idénticos)
const colors = {
  primary: '#25D366',
  background: '#0B141A',
  surface: '#1F2C34',
  surfaceLight: '#2A3942',
  textPrimary: '#FFFFFF',
  textSecondary: '#8696A0',
  textMuted: '#667781',
  border: '#2A3942',
  bubbleOwn: '#005C4B',
  bubbleOther: '#1F2C34',
}

// Usuarios del chat
const USERS: Record<string, { id: string; visibleName: string; isBot: boolean }> = {
  angel: { id: 'user-angel', visibleName: 'Ángel', isBot: false },
  kike: { id: 'user-kike', visibleName: 'Kike', isBot: false },
  tanke: { id: 'bot-tanke', visibleName: 'Tanke', isBot: true },
  leo: { id: 'bot-leo', visibleName: 'Leo AI', isBot: true },
}

// ID de la conversación compartida
const CONVERSATION_ID = 'vertex-main-chat'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  type: string
  is_read: boolean
  created_at: string
}

// Formatear timestamp como WhatsSound
function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// Obtener nombre visible de un sender_id
function getSenderName(senderId: string): string {
  const entry = Object.values(USERS).find(u => u.id === senderId)
  return entry?.visibleName || 'Usuario'
}

function isBot(senderId: string): boolean {
  const entry = Object.values(USERS).find(u => u.id === senderId)
  return entry?.isBot || false
}

// Componente de burbuja de mensaje (idéntico a WhatsSound)
function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={`max-w-[80%] my-0.5 ${isOwn ? 'self-end' : 'self-start'}`}>
      <div 
        className={`px-3 py-2 ${isOwn ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'}`}
        style={{ backgroundColor: isOwn ? colors.bubbleOwn : (isBot(message.sender_id) ? '#4C1D95' : colors.bubbleOther) }}
      >
        {!isOwn && (
          <p className="text-xs font-medium mb-1" style={{ color: isBot(message.sender_id) ? '#C4B5FD' : colors.primary }}>
            {getSenderName(message.sender_id)} {isBot(message.sender_id) && '🤖'}
          </p>
        )}
        <p className="text-[15px] leading-5 whitespace-pre-wrap break-words" style={{ color: colors.textPrimary }}>
          {message.content}
        </p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[11px]" style={{ color: colors.textMuted }}>
            {formatMessageTime(new Date(message.created_at))}
          </span>
          {isOwn && (
            <svg className="w-4 h-4" style={{ color: message.is_read ? colors.primary : colors.textMuted }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const userKey = searchParams.get('u')?.toLowerCase()
  
  const [currentUser, setCurrentUser] = useState<typeof USERS[string] | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Identificar usuario
  useEffect(() => {
    if (userKey && USERS[userKey]) {
      setCurrentUser(USERS[userKey])
    }
    setLoading(false)
  }, [userKey])

  // Cargar mensajes y suscribirse a realtime
  useEffect(() => {
    if (!currentUser) return

    loadMessages()

    // Suscripción Realtime (como WhatsSound)
    const channel = supabase
      .channel(`chat-${CONVERSATION_ID}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ws_private_messages',
          filter: `conversation_id=eq.${CONVERSATION_ID}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser])

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('ws_private_messages')
      .select('*')
      .eq('conversation_id', CONVERSATION_ID)
      .order('created_at', { ascending: true })
      .limit(100)

    if (data) setMessages(data)
  }

  async function sendMessage() {
    if (!messageText.trim() || !currentUser || sending) return

    const content = messageText.trim()
    setMessageText('')
    setSending(true)

    // Mensaje optimista
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: CONVERSATION_ID,
      sender_id: currentUser.id,
      content,
      type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    const { data, error } = await supabase
      .from('ws_private_messages')
      .insert({
        conversation_id: CONVERSATION_ID,
        sender_id: currentUser.id,
        content,
        type: 'text',
      })
      .select()
      .single()

    if (error) {
      console.error('Error:', error)
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      setMessageText(content)
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? data : m))
    }

    setSending(false)
    inputRef.current?.focus()
  }

  // Pantalla de selección de usuario
  if (!currentUser && !loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4" style={{ background: colors.background }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: colors.textPrimary }}>Chat Vertex</h1>
        <p className="mb-8" style={{ color: colors.textSecondary }}>Selecciona tu usuario</p>
        <div className="grid grid-cols-2 gap-4 max-w-sm w-full">
          {Object.entries(USERS).map(([key, u]) => (
            <a
              key={key}
              href={`?u=${key}`}
              className="p-4 rounded-xl text-center transition-transform hover:scale-105"
              style={{ background: colors.surface }}
            >
              <div 
                className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-xl mb-2"
                style={{ background: u.isBot ? '#7C3AED' : colors.primary }}
              >
                {u.isBot ? '🤖' : u.visibleName[0]}
              </div>
              <p style={{ color: colors.textPrimary }}>{u.visibleName}</p>
            </a>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: colors.background }}>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: colors.primary }}></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: colors.background }}>
      {/* Header (como WhatsSound) */}
      <header className="flex items-center gap-3 px-4 py-3" style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
        <a href="/" className="p-1" style={{ color: colors.textPrimary }}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: colors.primary }}
        >
          <span className="text-white font-bold">V</span>
        </div>
        <div className="flex-1">
          <h2 className="font-medium" style={{ color: colors.textPrimary }}>Grupo Vertex</h2>
          <p className="text-xs" style={{ color: colors.textSecondary }}>
            Conectado como {currentUser?.visibleName}
          </p>
        </div>
      </header>

      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center" style={{ color: colors.textMuted }}>
            <span className="text-5xl mb-4">💬</span>
            <p>No hay mensajes</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              isOwn={msg.sender_id === currentUser?.id} 
            />
          ))
        )}
      </div>

      {/* Input (como WhatsSound) */}
      <div className="p-3" style={{ background: colors.surface, borderTop: `1px solid ${colors.border}` }}>
        <div className="flex items-end gap-2">
          <input
            ref={inputRef}
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Escribe un mensaje"
            disabled={sending}
            className="flex-1 px-4 py-2 rounded-full focus:outline-none"
            style={{ 
              background: colors.surfaceLight, 
              color: colors.textPrimary,
              fontSize: '16px',
            }}
            autoComplete="off"
          />
          <button
            onClick={sendMessage}
            disabled={!messageText.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
            style={{ background: messageText.trim() ? colors.primary : colors.surfaceLight }}
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
      </div>
    </div>
  )
}
