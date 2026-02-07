'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ============================================================
// CHAT VERTEX — Visual idéntico a WhatsSound
// Tablas separadas: cv_messages (NO toca WhatsSound)
// ============================================================

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

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={`max-w-[80%] my-0.5 ${isOwn ? 'self-end' : 'self-start'}`}>
      <div 
        className={`px-3 py-2 ${isOwn ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'}`}
        style={{ backgroundColor: isOwn ? colors.bubbleOwn : (message.is_bot ? '#4C1D95' : colors.bubbleOther) }}
      >
        {!isOwn && (
          <p className="text-xs font-medium mb-1" style={{ color: message.is_bot ? '#C4B5FD' : colors.primary }}>
            {message.sender_name} {message.is_bot && '🤖'}
          </p>
        )}
        <p className="text-[15px] leading-5 whitespace-pre-wrap break-words" style={{ color: colors.textPrimary }}>
          {message.content}
        </p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[11px]" style={{ color: colors.textMuted }}>
            {formatTime(new Date(message.created_at))}
          </span>
          {isOwn && (
            <svg className="w-4 h-4" style={{ color: colors.primary }} fill="currentColor" viewBox="0 0 24 24">
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
  
  const [user, setUser] = useState<typeof USERS[string] | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (userKey && USERS[userKey]) setUser(USERS[userKey])
    setLoading(false)
  }, [userKey])

  useEffect(() => {
    if (!user) return
    loadMessages()

    const channel = supabase
      .channel('cv-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'cv_messages',
      }, (payload) => {
        const msg = payload.new as Message
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('cv_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data)
  }

  async function send() {
    if (!text.trim() || !user || sending) return
    const content = text.trim()
    setText('')
    setSending(true)

    const temp: Message = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      sender_name: user.name,
      content,
      is_bot: user.isBot,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, temp])

    const { data, error } = await supabase
      .from('cv_messages')
      .insert({ sender_id: user.id, sender_name: user.name, content, is_bot: user.isBot })
      .select()
      .single()

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== temp.id))
      setText(content)
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === temp.id ? data : m))
    }
    setSending(false)
    inputRef.current?.focus()
  }

  if (!user && !loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4" style={{ background: colors.background }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: colors.textPrimary }}>Chat Vertex</h1>
        <p className="mb-8" style={{ color: colors.textSecondary }}>Selecciona tu usuario</p>
        <div className="grid grid-cols-2 gap-4 max-w-sm w-full">
          {Object.entries(USERS).map(([key, u]) => (
            <a key={key} href={`?u=${key}`} className="p-4 rounded-xl text-center hover:scale-105 transition-transform" style={{ background: colors.surface }}>
              <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-xl mb-2" style={{ background: u.isBot ? '#7C3AED' : colors.primary }}>
                {u.isBot ? '🤖' : u.name[0]}
              </div>
              <p style={{ color: colors.textPrimary }}>{u.name}</p>
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
      <header className="flex items-center gap-3 px-4 py-3" style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
        <a href="/" className="p-1" style={{ color: colors.textPrimary }}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: colors.primary }}>
          <span className="text-white font-bold">V</span>
        </div>
        <div className="flex-1">
          <h2 className="font-medium" style={{ color: colors.textPrimary }}>Grupo Vertex</h2>
          <p className="text-xs" style={{ color: colors.textSecondary }}>Conectado como {user?.name}</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center" style={{ color: colors.textMuted }}>
            <span className="text-5xl mb-4">💬</span>
            <p>No hay mensajes</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isOwn={msg.sender_id === user?.id} />
          ))
        )}
      </div>

      <div className="p-3" style={{ background: colors.surface, borderTop: `1px solid ${colors.border}` }}>
        <div className="flex items-end gap-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Escribe un mensaje"
            disabled={sending}
            className="flex-1 px-4 py-2 rounded-full focus:outline-none"
            style={{ background: colors.surfaceLight, color: colors.textPrimary, fontSize: '16px' }}
            autoComplete="off"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50"
            style={{ background: text.trim() ? colors.primary : colors.surfaceLight }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
