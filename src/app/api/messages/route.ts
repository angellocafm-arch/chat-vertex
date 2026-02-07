import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// API Keys para bots
const BOT_KEYS: Record<string, { id: string; name: string }> = {
  'tanke-secret-key-2026': { id: 'bot-tanke', name: 'Tanke' },
  'leo-secret-key-2026': { id: 'bot-leo', name: 'Leo AI' },
}

// GET /api/messages - Leer mensajes
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  const since = request.nextUrl.searchParams.get('since')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')

  // Verificar API key
  if (!apiKey || !BOT_KEYS[apiKey]) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  let query = supabase
    .from('cv_messages')
    .select('*')
    .eq('conversation_id', 'main')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (since) {
    query = query.gt('created_at', since)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    messages: data,
    bot: BOT_KEYS[apiKey]
  })
}

// POST /api/messages - Enviar mensaje
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  
  // Verificar API key
  if (!apiKey || !BOT_KEYS[apiKey]) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const bot = BOT_KEYS[apiKey]
  
  try {
    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('cv_messages')
      .insert({
        conversation_id: 'main',
        sender_id: bot.id,
        sender_name: bot.name,
        content: content.trim(),
        is_bot: true
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: data
    })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
}
