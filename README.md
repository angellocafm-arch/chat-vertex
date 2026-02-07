# Chat Vertex

**WhatsApp privado para Vertex Developer: Ángel, Enrique, Leo y Tanke**

## Stack
- **Frontend:** Next.js 14 + Tailwind
- **Backend:** Supabase (PostgreSQL + Realtime + Auth)
- **Deploy:** Vercel
- **Monitoreo:** Sentry + PostHog

## Estructura
```
chat-vertex/
├── src/
│   ├── app/           # Páginas Next.js
│   ├── components/    # UI
│   └── lib/           # Supabase client, utils
├── supabase/
│   └── migrations/    # SQL schemas
├── api-endpoints.ts   # Lógica de API
└── docs/
```

## Instalación
```bash
npm install
npm run dev
```

## Variables de entorno
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

## Estado
- [x] Schema SQL
- [x] Endpoints API
- [ ] UI del chat
- [ ] Deploy Supabase
- [ ] Deploy Vercel
- [ ] Conectar webhooks Tanke/Leo

## Autores
- **Tanke** - Schema + API
- **Leo** - (pendiente)
