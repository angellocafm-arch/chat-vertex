"use client";

import { useState } from "react";
import { User, loginWithPhone } from "@/lib/auth";
import { MessageSquare } from "lucide-react";

interface Props {
  onLogin: (user: User) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    setError("");

    const result = await loginWithPhone(phone);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.user) {
      onLogin(result.user);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-vertex-dark to-vertex-darker p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-vertex-accent mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Chat Vertex</h1>
          <p className="text-gray-400 mt-2">El WhatsApp de Vertex Developer</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Tu teléfono
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 666 123 456"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-vertex-accent transition-colors"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="w-full py-3 rounded-xl bg-vertex-accent text-white font-medium hover:bg-vertex-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-8">
          Solo para Ángel, Kike, Leo y Tanke 🔒
        </p>
      </div>
    </div>
  );
}
