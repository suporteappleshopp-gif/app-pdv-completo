#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis dos arquivos .env
function loadEnvFiles() {
  const envFiles = ['.env', '.env.local', '.env.production'];
  envFiles.forEach(file => {
    try {
      const envPath = path.join(__dirname, file);
      if (!fs.existsSync(envPath)) return;
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      lines.forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = value;
        }
      });
    } catch (error) {}
  });
}

loadEnvFiles();

async function corrigirItensVenda() {
  console.log('🔧 Corrigindo tabela itens_venda...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('✅ Conectado ao Supabase');
  console.log(`📡 URL: ${supabaseUrl}\n`);

  // Verificar se a coluna existe
  console.log('🔍 Verificando coluna nome...');
  const { data: testData, error: testError } = await supabase
    .from('itens_venda')
    .select('nome')
    .limit(1);

  if (!testError) {
    console.log('✅ Coluna "nome" JÁ EXISTE!');
    console.log('✨ Nenhuma ação necessária.\n');
    process.exit(0);
  }

  console.log('⚠️  Coluna "nome" NÃO encontrada');
  console.log('📝 Erro:', testError.message, '\n');

  console.log('═'.repeat(70));
  console.log('📋 INSTRUÇÕES - Execute o SQL abaixo no Supabase Dashboard');
  console.log('═'.repeat(70));
  console.log('\n-- SQL para corrigir:\n');
  console.log(`
-- Adicionar coluna nome
ALTER TABLE itens_venda
ADD COLUMN IF NOT EXISTS nome TEXT;

-- Preencher valores NULL
UPDATE itens_venda
SET nome = COALESCE(nome, 'Produto')
WHERE nome IS NULL;

-- Tornar obrigatória
ALTER TABLE itens_venda
ALTER COLUMN nome SET NOT NULL;
  `);
  console.log('═'.repeat(70));
  console.log('\nApós executar, teste novamente criando uma venda no app.\n');
}

corrigirItensVenda().catch((error) => {
  console.error('❌ Erro:', error.message);
  process.exit(1);
});
