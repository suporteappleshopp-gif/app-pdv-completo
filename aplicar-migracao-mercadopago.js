#!/usr/bin/env node

/**
 * Script para aplicar migração das colunas do MercadoPago
 * Executa: node aplicar-migracao-mercadopago.js
 */

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
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    } catch (error) {
      // Silenciar erros
    }
  });
}

loadEnvFiles();

async function aplicarMigracao() {
  console.log('🔧 Iniciando aplicação da migração...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    console.error('   Certifique-se de que .env.local contém:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('✅ Cliente Supabase criado');
  console.log(`📡 Conectando em: ${supabaseUrl}\n`);

  // Verificar se as colunas já existem
  console.log('🔍 Verificando se as colunas já existem...');

  const { data: testData, error: testError } = await supabase
    .from('solicitacoes_renovacao')
    .select('mercadopago_preference_id, mercadopago_payment_id')
    .limit(1);

  if (!testError) {
    console.log('✅ As colunas JÁ EXISTEM no banco de dados!');
    console.log('   - mercadopago_preference_id ✓');
    console.log('   - mercadopago_payment_id ✓');
    console.log('\n✨ Nenhuma ação necessária. O banco está correto!');
    process.exit(0);
  }

  console.log('⚠️  Colunas não encontradas. Erro:', testError.message);
  console.log('\n📋 É necessário executar o SQL manualmente no Supabase Dashboard.\n');
  console.log('═'.repeat(70));
  console.log('INSTRUÇÕES:');
  console.log('═'.repeat(70));
  console.log('1. Acesse: https://supabase.com/dashboard');
  console.log('2. Selecione seu projeto');
  console.log('3. Vá em "SQL Editor" no menu lateral');
  console.log('4. Cole o SQL abaixo e clique em "Run" (ou Ctrl+Enter)');
  console.log('═'.repeat(70));
  console.log('\n-- SQL PARA EXECUTAR:\n');
  console.log(`
-- Adicionar colunas do MercadoPago
ALTER TABLE public.solicitacoes_renovacao
ADD COLUMN IF NOT EXISTS mercadopago_preference_id TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_preference_id
ON public.solicitacoes_renovacao(mercadopago_preference_id);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_payment_id
ON public.solicitacoes_renovacao(mercadopago_payment_id);

-- Adicionar comentários
COMMENT ON COLUMN public.solicitacoes_renovacao.mercadopago_preference_id IS 'ID da preferência de pagamento criada no MercadoPago';
COMMENT ON COLUMN public.solicitacoes_renovacao.mercadopago_payment_id IS 'ID do pagamento confirmado pelo MercadoPago (preenchido pelo webhook)';
  `);
  console.log('═'.repeat(70));
  console.log('\n5. Após executar com sucesso, rode este script novamente para confirmar.');
  console.log('   node aplicar-migracao-mercadopago.js\n');
}

aplicarMigracao().catch((error) => {
  console.error('❌ Erro fatal:', error.message);
  process.exit(1);
});
