'use client'

import { useEffect, useState } from 'react'
import { LoginScreen } from '@/components/LoginScreen'
import { ChatList } from '@/components/ChatList'
import { ChatWindow } from '@/components/ChatWindow'

interface User {
  id: string
  name: string
  username: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar si hay usuario en localStorage
    const stored = localStorage.getItem('chat-vertex-user')
    if (stored) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  function handleLogout() {
    localStorage.removeItem('chat-vertex-user')
    setUser(null)
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />
  }

  return (
    <main className="h-screen flex bg-gray-900">
      {/* Sidebar */}
      <aside className="w-80 border-r border-gray-700 flex flex-col">
        <header className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">Chat Vertex</h1>
            <p className="text-sm text-gray-400">{user.name}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="text-gray-400 hover:text-white text-sm"
          >
            Salir
          </button>
        </header>
        <ChatList 
          userId={user.id} 
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat} 
        />
      </aside>

      {/* Main */}
      <section className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatWindow 
            conversationId={selectedChat} 
            userId={user.id}
            userName={user.name}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-6xl mb-4">💬</p>
              <p>Selecciona una conversación</p>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
