import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos
export interface User {
  id: string;
  phone: string;
  display_name: string;
  avatar_url?: string;
  is_bot: boolean;
}

export interface Conversation {
  id: string;
  name?: string;
  is_group: boolean;
  created_at: string;
  participants?: User[];
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "image" | "file" | "audio";
  created_at: string;
  sender?: User;
}
