#!/bin/bash
# Chat Vertex - Setup
# Ejecutar: ./setup.sh

echo "🚀 Chat Vertex Setup"

# Arreglar permisos de npm
echo "→ Arreglando permisos npm..."
sudo chown -R $(whoami):staff ~/.npm

# Instalar dependencias
echo "→ Instalando dependencias..."
npm install

# Instalar pg para migraciones
npm install pg --save-dev

# Ejecutar migraciones
echo "→ Ejecutando migraciones en Supabase..."
node -e "
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: 'postgresql://postgres.ptwwsbnuatdbdxiquusj:Tanke2026!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const sql = fs.readFileSync('./supabase/migrations/002_chat_vertex_schema.sql', 'utf8');
  await client.query(sql);
  console.log('✅ Migraciones aplicadas');
  await client.end();
}
run().catch(e => { console.error('❌', e.message); process.exit(1); });
"

echo ""
echo "✅ Setup completo"
echo "→ Ejecuta: npm run dev"
echo "→ Abre: http://localhost:3000"
