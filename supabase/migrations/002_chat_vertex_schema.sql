-- ============================================
-- CHAT VERTEX - SCHEMA SIMPLIFICADO
-- Solo para: Ángel, Kike, Leo, Tanke
-- Fecha: 2026-02-07
-- ============================================

-- Drop tablas si existen (para desarrollo)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 1. USUARIOS
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  is_bot BOOLEAN DEFAULT false,
  bot_token TEXT,  -- Solo para bots (Leo, Tanke)
  created_at TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now()
);

-- Insertar usuarios iniciales
INSERT INTO users (phone, display_name, is_bot) VALUES
  ('+34600000001', 'Ángel', false),
  ('+34600000002', 'Kike', false),
  ('leo-bot', 'Leo', true),
  ('tanke-bot', 'Tanke', true);

-- Actualizar tokens de bots
UPDATE users SET bot_token = encode(gen_random_bytes(32), 'hex') WHERE is_bot = true;

-- ============================================
-- 2. CONVERSACIONES
-- ============================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  is_group BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crear sala principal
INSERT INTO conversations (name, is_group) VALUES ('Vertex HQ', true);

-- ============================================
-- 3. PARTICIPANTES
-- ============================================

CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

-- Añadir todos a la sala principal
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT c.id, u.id FROM conversations c, users u WHERE c.name = 'Vertex HQ';

-- ============================================
-- 4. MENSAJES
-- ============================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT now(),
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false
);

-- Índices
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_conv_created ON messages(conversation_id, created_at DESC);

-- ============================================
-- 5. FUNCIONES
-- ============================================

-- Actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 6. REALTIME
-- ============================================

-- Habilitar realtime para mensajes
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- ============================================
-- 7. RLS (DESHABILITADO PARA DEMO)
-- ============================================

-- Por ahora sin RLS para simplificar
-- Lo habilitamos después con auth real

-- Permisos públicos temporales
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para demo
CREATE POLICY "Public users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public participants" ON conversation_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public messages" ON messages FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- DONE 🚀
-- ============================================
