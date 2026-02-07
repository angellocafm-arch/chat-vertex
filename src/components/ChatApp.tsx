"use client";

import { useState, useEffect } from "react";
import { supabase, User, Conversation, Message } from "@/lib/supabase";
import { clearStoredUser } from "@/lib/auth";
import ConversationList from "./ConversationList";
import ChatView from "./ChatView";
import { LogOut, Plus } from "lucide-react";

interface Props {
  user: User;
  onLogout: () => void;
}

export default function ChatApp({ user, onLogout }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();

    // Suscripción a nuevos mensajes
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  async function loadConversations() {
    const { data } = await supabase
      .from("conversation_participants")
      .select(`
        conversation:conversations (
          id,
          name,
          is_group,
          created_at
        )
      `)
      .eq("user_id", user.id);

    if (data) {
      const convs = data.map((d: any) => d.conversation).filter(Boolean);
      setConversations(convs);
    }
    setLoading(false);
  }

  async function createGroupChat() {
    const name = prompt("Nombre del grupo:");
    if (!name) return;

    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({ name, is_group: true })
      .select()
      .single();

    if (conv) {
      // Añadir al creador como participante
      await supabase.from("conversation_participants").insert({
        conversation_id: conv.id,
        user_id: user.id,
      });
      loadConversations();
    }
  }

  function handleLogout() {
    clearStoredUser();
    onLogout();
  }

  return (
    <div className="flex h-screen bg-vertex-dark">
      {/* Sidebar */}
      <div className="w-80 border-r border-white/10 flex flex-col">
        {/* Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-vertex-accent flex items-center justify-center text-white font-medium">
              {user.display_name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{user.display_name}</p>
              <p className="text-gray-500 text-xs">{user.phone}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createGroupChat}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              title="Crear grupo"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lista de conversaciones */}
        <ConversationList
          conversations={conversations}
          selectedId={selectedConv?.id}
          onSelect={setSelectedConv}
          loading={loading}
          currentUserId={user.id}
        />
      </div>

      {/* Chat principal */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <ChatView conversation={selectedConv} currentUser={user} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg">Chat Vertex 🚀</p>
              <p className="text-sm mt-1">Selecciona un chat para empezar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
