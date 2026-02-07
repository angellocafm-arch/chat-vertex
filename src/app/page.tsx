"use client";

import { useEffect, useState } from "react";
import { getStoredUser, User } from "@/lib/auth";
import LoginScreen from "@/components/LoginScreen";
import ChatApp from "@/components/ChatApp";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vertex-dark">
        <div className="animate-pulse text-gray-400">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return <ChatApp user={user} onLogout={() => setUser(null)} />;
}
