"use client";

import { Conversation } from "@/lib/supabase";
import { Users, User } from "lucide-react";

interface Props {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conv: Conversation) => void;
  loading: boolean;
  currentUserId: string;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Cargando chats...</div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <p>No tienes chats todavía</p>
          <p className="text-sm mt-1">Crea un grupo con el botón +</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv)}
          className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors ${
            selectedId === conv.id ? "bg-white/10" : ""
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-vertex-accent to-purple-600 flex items-center justify-center text-white">
            {conv.is_group ? (
              <Users className="w-5 h-5" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-white font-medium truncate">
              {conv.name || "Chat privado"}
            </p>
            <p className="text-gray-500 text-sm truncate">
              {conv.last_message?.content || "Sin mensajes"}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
