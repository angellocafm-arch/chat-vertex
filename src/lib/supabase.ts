/**
 * Chat Vertex — Supabase Client
 * Misma configuración que WhatsSound
 */

import { createClient } from '@supabase/supabase-js'

// Proyecto: openparty2026@gmail.com (ptwwsbnuatdbdxiquusj)
const supabaseUrl = 'https://ptwwsbnuatdbdxiquusj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0d3dzYm51YXRkYmR4aXF1dXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTkwMjEsImV4cCI6MjA4NTE5NTAyMX0.qJXn_cGYDltQH0KCNPN8sgvkYMhKCA6QG7DSPXK87ro'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
