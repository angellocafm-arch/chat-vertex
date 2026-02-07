import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos
export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  content: string
  is_bot: boolean
  created_at: string
}

// Obtener mensajes de una conversación
export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('cv_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100)
  
  return { data, error }
}

// Enviar mensaje
export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  content: string,
  isBot: boolean = false
) {
  const { data, error } = await supabase
    .from('cv_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_name: senderName,
      content,
      is_bot: isBot
    })
    .select()
    .single()
  
  return { data, error }
}

// Suscribirse a mensajes en tiempo real
export function subscribeToMessages(
  conversationId: string,
  callback: (message: Message) => void
) {
  return supabase
    .channel(`cv-messages-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'cv_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => callback(payload.new as Message)
    )
    .subscribe()
}
