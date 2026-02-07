"use client";

import { useState, useEffect, useRef } from "react";
import { supabase, User, Conversation, Message } from "@/lib/supabase";
import { Send, Bot, User as UserIcon } from "lucide-react";

interface Props {
  conversation: Conversation;
  currentUser: User;
}

export default function ChatView({ conversation, currentUser }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<Record<string, User>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    loadParticipants();

    // Suscripción realtime
    const channel = supabase
      .channel(`chat:${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      setMessages(data);
    }
  }

  async function loadParticipants() {
    const { data } = await supabase
      .from("conversation_participants")
      .select("user:users (*)")
      .eq("conversation_id", conversation.id);

    if (data) {
      const userMap: Record<string, User> = {};
      data.forEach((d: any) => {
        if (d.user) userMap[d.user.id] = d.user;
      });
      setUsers(userMap);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const content = newMessage;
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      content,
      message_type: "text",
    });

    if (error) {
      console.error("Error sending:", error);
      setNewMessage(content);
    }

    setSending(false);
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getUser(senderId: string): User | undefined {
    return users[senderId];
  }

  return (
    <>
      {/* Header del chat */}
      <div className="h-16 px-6 flex items-center border-b border-white/10 bg-vertex-darker">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vertex-accent to-purple-600 flex items-center justify-center text-white">
            {conversation.name?.charAt(0).toUpperCase() || "C"}
          </div>
          <div>
            <p className="text-white font-medium">{conversation.name || "Chat"}</p>
            <p className="text-gray-500 text-xs">
              {Object.keys(users).length} participantes
            </p>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUser.id;
          const sender = getUser(msg.sender_id);
          const isBot = sender?.is_bot;

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  isMe
                    ? "bg-vertex-accent text-white rounded-br-md"
                    : isBot
                    ? "bg-purple-900/50 text-white rounded-bl-md border border-purple-500/30"
                    : "bg-white/10 text-white rounded-bl-md"
                }`}
              >
                {!isMe && conversation.is_group && (
                  <div className="flex items-center gap-1 mb-1">
                    {isBot ? (
                      <Bot className="w-3 h-3 text-purple-400" />
                    ) : (
                      <UserIcon className="w-3 h-3 text-gray-400" />
                    )}
                    <span className={`text-xs font-medium ${isBot ? "text-purple-400" : "text-vertex-accent"}`}>
                      {sender?.display_name || "Usuario"}
                    </span>
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? "text-white/60" : "text-gray-500"}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/10">
        <div className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-vertex-accent transition-colors"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-4 rounded-xl bg-vertex-accent text-white hover:bg-vertex-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </>
  );
}
