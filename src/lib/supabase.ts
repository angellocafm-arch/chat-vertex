import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos
export interface Conversation {
  id: string
  type: 'direct' | 'group' | 'bot_direct' | 'bot_group'
  name: string | null
  last_message_at: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_user_id: string | null
  sender_bot_id: string | null
  content: string
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'system'
  reply_to: string | null
  created_at: string
  is_deleted: boolean
}

export interface Bot {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

// Helpers
export async function getConversations(userId: string) {
  const { data, error } = await supabase
    .from('ws_conversations')
    .select(`
      *,
      members:ws_conversation_members(user_id, bot_id, last_read_at),
      messages:ws_messages(id, content, type, created_at, sender_user_id, sender_bot_id)
    `)
    .order('last_message_at', { ascending: false })
  
  return { data, error }
}

export async function getMessages(conversationId: string, limit = 50) {
  const { data, error } = await supabase
    .from('ws_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  return { data: data?.reverse(), error }
}

export async function sendMessage(
  conversationId: string,
  userId: string,
  content: string,
  replyTo?: string
) {
  const { data, error } = await supabase
    .from('ws_messages')
    .insert({
      conversation_id: conversationId,
      sender_user_id: userId,
      content,
      type: 'text',
      reply_to: replyTo
    })
    .select()
    .single()
  
  return { data, error }
}

export function subscribeToMessages(
  conversationId: string,
  callback: (message: Message) => void
) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ws_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => callback(payload.new as Message)
    )
    .subscribe()
}
