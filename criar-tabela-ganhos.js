/**
 * Script para criar a tabela ganhos_admin no Supabase
 * Execute: node criar-tabela-ganhos.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Ler variáveis de ambiente
const envPath = path.join(__dirname, '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Criando tabela ganhos_admin...\n');
console.log('📡 URL:', supabaseUrl);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const criarTabelaSQL = `
-- Criar tabela ganhos_admin
CREATE TABLE IF NOT EXISTS ganhos_admin (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('conta-criada', 'mensalidade-paga')),
  usuario_id TEXT NOT NULL,
  usuario_nome TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desabilitar RLS (sem restrições de segurança)
ALTER TABLE ganhos_admin DISABLE ROW LEVEL SECURITY;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_tipo ON ganhos_admin(tipo);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_usuario_id ON ganhos_admin(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_created_at ON ganhos_admin(created_at);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_forma_pagamento ON ganhos_admin(forma_pagamento);
`;

async function criarTabela() {
  try {
    console.log('1️⃣ Executando SQL para criar tabela...\n');
    console.log(criarTabelaSQL);
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('\n💡 PARA CRIAR A TABELA:');
    console.log('\n1. Acesse o SQL Editor do Supabase:');
    console.log('   https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new');
    console.log('\n2. Cole o SQL acima no editor');
    console.log('\n3. Pressione Ctrl+Enter ou clique em "Run"');
    console.log('\n4. Aguarde a mensagem de sucesso');
    console.log('\n═══════════════════════════════════════════════════════\n');

    // Salvar SQL em arquivo para facilitar
    fs.writeFileSync('CREATE_GANHOS_ADMIN_TABLE.sql', criarTabelaSQL);
    console.log('✅ SQL salvo no arquivo: CREATE_GANHOS_ADMIN_TABLE.sql');
    console.log('   Você pode copiar deste arquivo e colar no Supabase\n');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  }
}

criarTabela();
