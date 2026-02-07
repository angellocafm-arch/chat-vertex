'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ChatList } from '@/components/ChatList'
import { ChatWindow } from '@/components/ChatWindow'
import { LoginScreen } from '@/components/LoginScreen'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <main className="h-screen flex bg-gray-900">
      {/* Sidebar - Lista de chats */}
      <aside className="w-80 border-r border-gray-700 flex flex-col">
        <header className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">Chat Vertex</h1>
          <p className="text-sm text-gray-400">{user.phone || user.email}</p>
        </header>
        <ChatList 
          userId={user.id} 
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat} 
        />
      </aside>

      {/* Main - Ventana de chat */}
      <section className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatWindow 
            conversationId={selectedChat} 
            userId={user.id} 
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>Selecciona una conversación</p>
          </div>
        )}
      </section>
    </main>
  )
}
