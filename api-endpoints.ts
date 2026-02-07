// ============================================
// CHAT VERTEX - API ENDPOINTS
// Stack: Supabase Edge Functions + Next.js API Routes
// Autor: Tanke
// Fecha: 2026-02-07
// ============================================

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// ============================================
// 1. AUTENTICACIÓN
// ============================================

// POST /api/auth/login
export async function login(phone: string, countryCode: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: `${countryCode}${phone}`
  })
  return { data, error }
}

// POST /api/auth/verify
export async function verifyOtp(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms'
  })
  return { data, error }
}

// ============================================
// 2. CONVERSACIONES
// ============================================

// GET /api/conversations
export async function getConversations(userId: string) {
  const { data, error } = await supabase
    .from('ws_conversations')
    .select(`
      *,
      members:ws_conversation_members(
        user_id,
        bot_id,
        last_read_at
      ),
      last_message:ws_messages(
        id,
        content,
        type,
        created_at,
        sender_user_id,
        sender_bot_id
      )
    `)
    .order('last_message_at', { ascending: false })
  
  return { data, error }
}

// POST /api/conversations
export async function createConversation(
  creatorId: string,
  type: 'direct' | 'group' | 'bot_direct' | 'bot_group',
  memberIds: string[],
  botIds: string[] = [],
  name?: string
) {
  // 1. Crear conversación
  const { data: conversation, error: convError } = await supabase
    .from('ws_conversations')
    .insert({
      type,
      name,
      created_by: creatorId
    })
    .select()
    .single()

  if (convError) return { error: convError }

  // 2. Añadir miembros (usuarios)
  const userMembers = memberIds.map(userId => ({
    conversation_id: conversation.id,
    user_id: userId,
    role: userId === creatorId ? 'owner' : 'member'
  }))

  // 3. Añadir miembros (bots)
  const botMembers = botIds.map(botId => ({
    conversation_id: conversation.id,
    bot_id: botId,
    role: 'member'
  }))

  const { error: membersError } = await supabase
    .from('ws_conversation_members')
    .insert([...userMembers, ...botMembers])

  if (membersError) return { error: membersError }

  return { data: conversation }
}

// ============================================
// 3. MENSAJES
// ============================================

// GET /api/conversations/:id/messages
export async function getMessages(
  conversationId: string,
  limit: number = 50,
  before?: string
) {
  let query = supabase
    .from('ws_messages')
    .select(`
      *,
      sender_user:auth.users(id, raw_user_meta_data),
      sender_bot:ws_bots(id, username, display_name, avatar_url),
      reply:ws_messages(id, content, type)
    `)
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error } = await query
  return { data: data?.reverse(), error }
}

// POST /api/conversations/:id/messages
export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderType: 'user' | 'bot',
  content: string,
  type: string = 'text',
  replyTo?: string,
  mediaUrl?: string
) {
  const message = {
    conversation_id: conversationId,
    sender_user_id: senderType === 'user' ? senderId : null,
    sender_bot_id: senderType === 'bot' ? senderId : null,
    content,
    type,
    reply_to: replyTo,
    media_url: mediaUrl
  }

  const { data, error } = await supabase
    .from('ws_messages')
    .insert(message)
    .select()
    .single()

  if (error) return { error }

  // Disparar webhook a bots en la conversación
  await notifyBots(conversationId, 'new_message', data)

  return { data }
}

// ============================================
// 4. WEBHOOKS PARA BOTS
// ============================================

// Notificar a todos los bots en una conversación
async function notifyBots(
  conversationId: string,
  eventType: string,
  payload: any
) {
  // Obtener bots en la conversación
  const { data: members } = await supabase
    .from('ws_conversation_members')
    .select('bot_id, ws_bots(webhook_url, webhook_secret)')
    .eq('conversation_id', conversationId)
    .not('bot_id', 'is', null)

  if (!members) return

  // Encolar eventos para cada bot
  for (const member of members) {
    if (member.bot_id && member.ws_bots?.webhook_url) {
      await supabase.from('ws_bot_events').insert({
        bot_id: member.bot_id,
        event_type: eventType,
        payload: {
          conversation_id: conversationId,
          ...payload
        }
      })
    }
  }
}

// POST /api/bots/webhook-worker (ejecutar cada 5s con cron)
export async function processWebhookQueue() {
  const { data: events } = await supabase
    .from('ws_bot_events')
    .select('*, ws_bots(webhook_url, webhook_secret)')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .order('created_at')
    .limit(10)

  if (!events) return

  for (const event of events) {
    try {
      const response = await fetch(event.ws_bots.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': event.ws_bots.webhook_secret
        },
        body: JSON.stringify(event.payload)
      })

      if (response.ok) {
        await supabase
          .from('ws_bot_events')
          .update({ status: 'delivered', delivered_at: new Date().toISOString() })
          .eq('id', event.id)
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error: any) {
      await supabase
        .from('ws_bot_events')
        .update({
          attempts: event.attempts + 1,
          last_attempt_at: new Date().toISOString(),
          error_message: error.message,
          status: event.attempts >= 2 ? 'failed' : 'pending'
        })
        .eq('id', event.id)
    }
  }
}

// ============================================
// 5. REGISTRO DE BOTS
// ============================================

// POST /api/bots/register
export async function registerBot(
  ownerId: string,
  username: string,
  displayName: string,
  webhookUrl: string,
  description?: string
) {
  const { data, error } = await supabase
    .from('ws_bots')
    .insert({
      owner_id: ownerId,
      username,
      display_name: displayName,
      webhook_url: webhookUrl,
      description,
      status: 'active' // Auto-aprobar para Vertex
    })
    .select()
    .single()

  return { data, error }
}

// ============================================
// 6. LECTURA DE MENSAJES
// ============================================

// POST /api/conversations/:id/read
export async function markAsRead(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('ws_conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)

  return { success: !error, error }
}

// ============================================
// 7. REALTIME SUBSCRIPTIONS
// ============================================

// Cliente: suscribirse a mensajes de una conversación
export function subscribeToMessages(
  conversationId: string,
  callback: (message: any) => void
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
      callback
    )
    .subscribe()
}

// ============================================
// 8. ENDPOINT PARA BOTS (Tanke/Leo)
// ============================================

// POST /api/bot/send - Endpoint que usamos Tanke y Leo
export async function botSendMessage(
  authToken: string,
  conversationId: string,
  content: string,
  replyTo?: string
) {
  // Verificar token del bot
  const { data: bot, error: authError } = await supabase
    .from('ws_bots')
    .select('id, username')
    .eq('auth_token', authToken)
    .single()

  if (authError || !bot) {
    return { error: 'Invalid bot token' }
  }

  // Verificar que el bot está en la conversación
  const { data: membership } = await supabase
    .from('ws_conversation_members')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('bot_id', bot.id)
    .single()

  if (!membership) {
    return { error: 'Bot not in conversation' }
  }

  // Enviar mensaje
  return sendMessage(conversationId, bot.id, 'bot', content, 'text', replyTo)
}
