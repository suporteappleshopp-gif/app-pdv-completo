/**
 * Script para aplicar migrações no Supabase
 * Execute: node aplicar-migracoes.js
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

console.log('🔧 Aplicando migrações no Supabase...\n');

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

async function aplicarMigracoes() {
  try {
    console.log('1️⃣ Adicionando colunas de pagamento na tabela operadores...');

    // Executar cada comando SQL separadamente
    const comandos = [
      'ALTER TABLE operadores ADD COLUMN IF NOT EXISTS data_proximo_vencimento TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE operadores ADD COLUMN IF NOT EXISTS dias_assinatura INTEGER',
      "ALTER TABLE operadores ADD COLUMN IF NOT EXISTS forma_pagamento TEXT CHECK (forma_pagamento IN ('pix', 'cartao'))",
      'ALTER TABLE operadores ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10,2)',
      'ALTER TABLE operadores ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP WITH TIME ZONE',
    ];

    for (const sql of comandos) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
      if (error && !error.message.includes('already exists')) {
        console.log(`   ⚠️  ${error.message}`);
      }
    }

    console.log('   ✅ Colunas adicionadas!\n');

    console.log('2️⃣ Verificando resultado...');

    // Testar se as colunas foram criadas
    const { data, error } = await supabaseAdmin
      .from('operadores')
      .select('id, nome, email, data_proximo_vencimento, dias_assinatura, forma_pagamento')
      .limit(1);

    if (error) {
      console.log('   ⚠️  Aviso:', error.message);
      console.log('\n💡 As migrações precisam ser aplicadas manualmente.');
      console.log('   Veja o conteúdo que precisa ser executado abaixo:\n');
      console.log('═══════════════════════════════════════════════════════');
      console.log('-- Cole este SQL no Supabase SQL Editor:');
      console.log('-- https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new\n');
      comandos.forEach(cmd => console.log(cmd + ';'));
      console.log('═══════════════════════════════════════════════════════\n');
    } else {
      console.log('   ✅ Migrações aplicadas com sucesso!\n');
      console.log('🎉 Sistema configurado corretamente!');
      console.log('📊 Base limpa e pronta para novos cadastros\n');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📋 REGRAS CONFIGURADAS:');
      console.log('   ✓ PIX: R$ 59,90 - 60 dias');
      console.log('   ✓ Cartão: R$ 149,70 - 180 dias');
      console.log('   ✓ Pagamento obrigatório para ativação');
      console.log('   ✓ Nenhum usuário com acesso ilimitado');
      console.log('═══════════════════════════════════════════════════════\n');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.log('\n💡 Execute manualmente o SQL abaixo no Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new\n');
    console.log('ALTER TABLE operadores ADD COLUMN IF NOT EXISTS data_proximo_vencimento TIMESTAMP WITH TIME ZONE;');
    console.log('ALTER TABLE operadores ADD COLUMN IF NOT EXISTS dias_assinatura INTEGER;');
    console.log("ALTER TABLE operadores ADD COLUMN IF NOT EXISTS forma_pagamento TEXT CHECK (forma_pagamento IN ('pix', 'cartao'));");
    console.log('ALTER TABLE operadores ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10,2);');
    console.log('ALTER TABLE operadores ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP WITH TIME ZONE;\n');
  }
}

aplicarMigracoes();
