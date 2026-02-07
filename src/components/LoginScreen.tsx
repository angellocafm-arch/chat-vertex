'use client'

import { useState } from 'react'

const USERS: Record<string, { password: string; id: string; name: string }> = {
  angel: { password: '12345', id: 'user-angel', name: 'Ángel' },
  kike: { password: '12345', id: 'user-kike', name: 'Kike' },
  leo: { password: '12345', id: 'bot-leo', name: 'Leo AI' },
  tanke: { password: '12345', id: 'bot-tanke', name: 'Tanke' },
}

interface Props {
  onLogin: (user: { id: string; name: string; username: string }) => void
}

export function LoginScreen({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const user = USERS[username.toLowerCase()]
    
    if (!user) {
      setError('Usuario no encontrado')
      return
    }

    if (user.password !== password) {
      setError('Contraseña incorrecta')
      return
    }

    // Guardar en localStorage
    const userData = { id: user.id, name: user.name, username: username.toLowerCase() }
    localStorage.setItem('chat-vertex-user', JSON.stringify(userData))
    onLogin(userData)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center mb-4">
            <span className="text-4xl">💬</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Chat Vertex</h1>
          <p className="text-gray-400 mt-2">El WhatsApp de Vertex Developer</p>
        </div>

        {/* Form */}
        <div className="bg-gray-800 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="angel o kike"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-green-600 text-white rounded-lg py-3 font-medium hover:bg-green-700"
            >
              Entrar
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Usuarios: angel, kike, leo, tanke | Pass: 12345
        </p>
      </div>
    </div>
  )
}
