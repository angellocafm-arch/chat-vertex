-- ============================================
-- WHATSSOUND - SCHEMA DE BOTS Y MENSAJERÍA
-- Diseñado por: Tanke
-- Fecha: 2026-02-07
-- ============================================

-- ============================================
-- 1. TIPOS ENUMERADOS
-- ============================================

-- Tipos de mensaje (extensible)
CREATE TYPE message_type AS ENUM (
  'text',
  'image',
  'audio',
  'video',
  'file',
  'voice',
  'sticker',
  'location',
  'contact',
  'system'
);

-- Estado del bot
CREATE TYPE bot_status AS ENUM (
  'active',
  'inactive',
  'suspended',
  'pending_review'
);

-- Tipo de conversación
CREATE TYPE conversation_type AS ENUM (
  'direct',      -- 1:1 usuario-usuario
  'group',       -- Grupo de usuarios
  'bot_direct',  -- 1:1 usuario-bot
  'bot_group'    -- Bot en grupo
);

-- ============================================
-- 2. TABLA DE BOTS REGISTRADOS
-- ============================================

CREATE TABLE ws_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identidad del bot
  username VARCHAR(32) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  
  -- Propietario (usuario que creó el bot)
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Seguridad
  auth_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  webhook_url TEXT,  -- URL donde enviar eventos
  webhook_secret TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
  
  -- Configuración
  status bot_status DEFAULT 'pending_review',
  is_verified BOOLEAN DEFAULT false,
  is_official BOOLEAN DEFAULT false,  -- Bots oficiales de WhatsSound
  
  -- Permisos
  can_join_groups BOOLEAN DEFAULT true,
  can_send_media BOOLEAN DEFAULT true,
  can_read_history BOOLEAN DEFAULT false,
  
  -- Metadata
  commands JSONB DEFAULT '[]'::jsonb,  -- Lista de comandos disponibles
  capabilities JSONB DEFAULT '{}'::jsonb,
  
  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_ws_bots_owner ON ws_bots(owner_id);
CREATE INDEX idx_ws_bots_status ON ws_bots(status);
CREATE INDEX idx_ws_bots_username ON ws_bots(username);

-- ============================================
-- 3. TABLA DE CONVERSACIONES
-- ============================================

CREATE TABLE ws_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo de conversación
  type conversation_type NOT NULL DEFAULT 'direct',
  
  -- Metadata del grupo (si aplica)
  name VARCHAR(100),
  description TEXT,
  avatar_url TEXT,
  
  -- Creador
  created_by UUID REFERENCES auth.users(id),
  
  -- Configuración
  is_archived BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_ws_conversations_type ON ws_conversations(type);
CREATE INDEX idx_ws_conversations_last_message ON ws_conversations(last_message_at DESC);

-- ============================================
-- 4. MIEMBROS DE CONVERSACIÓN
-- ============================================

CREATE TABLE ws_conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ws_conversations(id) ON DELETE CASCADE,
  
  -- Puede ser usuario O bot (uno de los dos)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES ws_bots(id) ON DELETE CASCADE,
  
  -- Rol en la conversación
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  
  -- Estado de lectura POR USUARIO (no global)
  last_read_at TIMESTAMPTZ,
  last_read_message_id UUID,
  
  -- Configuración personal
  is_muted BOOLEAN DEFAULT false,
  muted_until TIMESTAMPTZ,
  nickname VARCHAR(50),  -- Nickname en este grupo
  
  -- Notificaciones
  notifications_enabled BOOLEAN DEFAULT true,
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT member_is_user_or_bot CHECK (
    (user_id IS NOT NULL AND bot_id IS NULL) OR
    (user_id IS NULL AND bot_id IS NOT NULL)
  ),
  CONSTRAINT unique_user_in_conversation UNIQUE (conversation_id, user_id),
  CONSTRAINT unique_bot_in_conversation UNIQUE (conversation_id, bot_id)
);

-- Índices
CREATE INDEX idx_ws_members_conversation ON ws_conversation_members(conversation_id);
CREATE INDEX idx_ws_members_user ON ws_conversation_members(user_id);
CREATE INDEX idx_ws_members_bot ON ws_conversation_members(bot_id);
CREATE INDEX idx_ws_members_last_read ON ws_conversation_members(last_read_at);

-- ============================================
-- 5. TABLA DE MENSAJES
-- ============================================

CREATE TABLE ws_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ws_conversations(id) ON DELETE CASCADE,
  
  -- Autor: puede ser usuario O bot
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_bot_id UUID REFERENCES ws_bots(id) ON DELETE SET NULL,
  
  -- Tipo de mensaje
  type message_type NOT NULL DEFAULT 'text',
  
  -- Contenido
  content TEXT,
  
  -- Media (si aplica)
  media_url TEXT,
  media_type VARCHAR(50),  -- MIME type
  media_size INTEGER,      -- Bytes
  media_duration INTEGER,  -- Segundos (audio/video)
  thumbnail_url TEXT,
  
  -- Metadata adicional
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Reply (para hilos)
  reply_to UUID REFERENCES ws_messages(id) ON DELETE SET NULL,
  
  -- Forward
  forwarded_from UUID REFERENCES ws_messages(id) ON DELETE SET NULL,
  
  -- Estado
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  
  -- Sistema
  is_system_message BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT sender_is_user_or_bot CHECK (
    (sender_user_id IS NOT NULL AND sender_bot_id IS NULL) OR
    (sender_user_id IS NULL AND sender_bot_id IS NOT NULL) OR
    (sender_user_id IS NULL AND sender_bot_id IS NULL AND is_system_message = true)
  )
);

-- Índices
CREATE INDEX idx_ws_messages_conversation ON ws_messages(conversation_id);
CREATE INDEX idx_ws_messages_sender_user ON ws_messages(sender_user_id);
CREATE INDEX idx_ws_messages_sender_bot ON ws_messages(sender_bot_id);
CREATE INDEX idx_ws_messages_created ON ws_messages(created_at DESC);
CREATE INDEX idx_ws_messages_reply ON ws_messages(reply_to);
CREATE INDEX idx_ws_messages_type ON ws_messages(type);

-- Índice compuesto para queries comunes
CREATE INDEX idx_ws_messages_conv_created ON ws_messages(conversation_id, created_at DESC);

-- ============================================
-- 6. REACCIONES A MENSAJES
-- ============================================

CREATE TABLE ws_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES ws_messages(id) ON DELETE CASCADE,
  
  -- Quién reaccionó (usuario o bot)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES ws_bots(id) ON DELETE CASCADE,
  
  -- La reacción (emoji)
  emoji VARCHAR(10) NOT NULL,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT reactor_is_user_or_bot CHECK (
    (user_id IS NOT NULL AND bot_id IS NULL) OR
    (user_id IS NULL AND bot_id IS NOT NULL)
  ),
  CONSTRAINT unique_user_reaction UNIQUE (message_id, user_id, emoji),
  CONSTRAINT unique_bot_reaction UNIQUE (message_id, bot_id, emoji)
);

-- Índices
CREATE INDEX idx_ws_reactions_message ON ws_message_reactions(message_id);

-- ============================================
-- 7. WEBHOOKS / EVENTOS PARA BOTS
-- ============================================

CREATE TABLE ws_bot_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES ws_bots(id) ON DELETE CASCADE,
  
  -- Tipo de evento
  event_type VARCHAR(50) NOT NULL,  -- message, reaction, member_join, etc.
  
  -- Payload del evento
  payload JSONB NOT NULL,
  
  -- Estado de entrega
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'expired')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours'
);

-- Índices
CREATE INDEX idx_ws_bot_events_bot ON ws_bot_events(bot_id);
CREATE INDEX idx_ws_bot_events_status ON ws_bot_events(status);
CREATE INDEX idx_ws_bot_events_created ON ws_bot_events(created_at DESC);

-- Limpiar eventos viejos automáticamente
CREATE INDEX idx_ws_bot_events_expires ON ws_bot_events(expires_at) WHERE status = 'pending';

-- ============================================
-- 8. RATE LIMITING PARA BOTS
-- ============================================

CREATE TABLE ws_bot_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES ws_bots(id) ON DELETE CASCADE,
  
  -- Ventana de tiempo
  window_start TIMESTAMPTZ NOT NULL,
  window_type VARCHAR(10) NOT NULL CHECK (window_type IN ('minute', 'day')),
  
  -- Contador
  request_count INTEGER DEFAULT 0,
  
  -- Único por bot y ventana
  UNIQUE (bot_id, window_start, window_type)
);

-- Índice para cleanup
CREATE INDEX idx_ws_rate_limits_window ON ws_bot_rate_limits(window_start);

-- ============================================
-- 9. FUNCIONES ÚTILES
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER ws_bots_updated_at
  BEFORE UPDATE ON ws_bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ws_conversations_updated_at
  BEFORE UPDATE ON ws_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Función para actualizar last_message_at en conversación
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ws_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ws_messages_update_conversation
  AFTER INSERT ON ws_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Función para contar mensajes no leídos por usuario
CREATE OR REPLACE FUNCTION get_unread_count(p_conversation_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  last_read TIMESTAMPTZ;
  unread_count INTEGER;
BEGIN
  SELECT last_read_at INTO last_read
  FROM ws_conversation_members
  WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
  
  SELECT COUNT(*) INTO unread_count
  FROM ws_messages
  WHERE conversation_id = p_conversation_id
    AND created_at > COALESCE(last_read, '1970-01-01'::timestamptz)
    AND sender_user_id != p_user_id
    AND is_deleted = false;
  
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE ws_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ws_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ws_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ws_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ws_message_reactions ENABLE ROW LEVEL SECURITY;

-- Políticas para ws_bots
CREATE POLICY "Bots públicos visibles para todos"
  ON ws_bots FOR SELECT
  USING (status = 'active');

CREATE POLICY "Propietarios pueden gestionar sus bots"
  ON ws_bots FOR ALL
  USING (owner_id = auth.uid());

-- Políticas para ws_conversations
CREATE POLICY "Miembros pueden ver sus conversaciones"
  ON ws_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ws_conversation_members
      WHERE conversation_id = id AND user_id = auth.uid() AND left_at IS NULL
    )
  );

-- Políticas para ws_messages
CREATE POLICY "Miembros pueden ver mensajes de sus conversaciones"
  ON ws_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ws_conversation_members
      WHERE conversation_id = ws_messages.conversation_id 
        AND user_id = auth.uid() 
        AND left_at IS NULL
    )
  );

CREATE POLICY "Miembros pueden enviar mensajes"
  ON ws_messages FOR INSERT
  WITH CHECK (
    sender_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM ws_conversation_members
      WHERE conversation_id = ws_messages.conversation_id 
        AND user_id = auth.uid() 
        AND left_at IS NULL
    )
  );

-- ============================================
-- 11. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE ws_bots IS 'Bots registrados en WhatsSound con webhook para recibir eventos';
COMMENT ON TABLE ws_conversations IS 'Conversaciones entre usuarios y/o bots';
COMMENT ON TABLE ws_conversation_members IS 'Miembros de cada conversación con estado de lectura individual';
COMMENT ON TABLE ws_messages IS 'Mensajes con soporte para replies, forwards y media';
COMMENT ON TABLE ws_message_reactions IS 'Reacciones emoji a mensajes';
COMMENT ON TABLE ws_bot_events IS 'Cola de eventos pendientes de entregar a bots via webhook';
COMMENT ON TABLE ws_bot_rate_limits IS 'Control de rate limiting por bot';

COMMENT ON COLUMN ws_bots.auth_token IS 'Token para autenticar requests del bot a la API';
COMMENT ON COLUMN ws_bots.webhook_secret IS 'Secret para firmar payloads de webhook (HMAC-SHA256)';
COMMENT ON COLUMN ws_conversation_members.last_read_at IS 'Timestamp del último mensaje leído por este miembro';
COMMENT ON COLUMN ws_messages.reply_to IS 'ID del mensaje al que responde (para hilos)';
