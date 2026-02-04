#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnvFiles() {
  const envFiles = ['.env', '.env.local', '.env.production'];
  envFiles.forEach(file => {
    try {
      const envPath = path.join(__dirname, file);
      if (!fs.existsSync(envPath)) return;
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match && !process.env[match[1].trim()]) {
          process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
      });
    } catch (error) {}
  });
}

loadEnvFiles();

async function limparVendas() {
  console.log('🔧 Limpando vendas e corrigindo itens_venda...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('✅ Conectado ao Supabase\n');

  // 1. Limpar itens_venda
  console.log('🗑️  Limpando itens_venda...');
  const { error: errorItens } = await supabase.from('itens_venda').delete().neq('id', 'xxxxx');
  if (errorItens) {
    console.error('❌ Erro ao limpar itens_venda:', errorItens.message);
  } else {
    console.log('✅ Itens_venda limpos');
  }

  // 2. Limpar vendas
  console.log('🗑️  Limpando vendas...');
  const { error: errorVendas } = await supabase.from('vendas').delete().neq('id', 'xxxxx');
  if (errorVendas) {
    console.error('❌ Erro ao limpar vendas:', errorVendas.message);
  } else {
    console.log('✅ Vendas limpas');
  }

  // 3. Limpar ganhos_admin
  console.log('🗑️  Limpando ganhos_admin...');
  const { error: errorGanhos } = await supabase.from('ganhos_admin').delete().neq('id', 'xxxxx');
  if (errorGanhos) {
    console.error('❌ Erro ao limpar ganhos_admin:', errorGanhos.message);
  } else {
    console.log('✅ Ganhos_admin limpos');
  }

  console.log('\n═══════════════════════════════════════');
  console.log('✨ LIMPEZA CONCLUÍDA!');
  console.log('═══════════════════════════════════════\n');
  console.log('📋 AGORA EXECUTE O SQL ABAIXO NO SUPABASE SQL EDITOR:\n');
  console.log(`
-- Remover coluna produto_nome e manter apenas nome
ALTER TABLE itens_venda
DROP COLUMN IF EXISTS produto_nome;

-- Garantir que nome seja NOT NULL
ALTER TABLE itens_venda
ALTER COLUMN nome SET NOT NULL;
  `);
  console.log('═══════════════════════════════════════\n');
  console.log('Após executar o SQL, teste criando uma nova venda!\n');
}

limparVendas().catch((error) => {
  console.error('❌ Erro:', error.message);
  process.exit(1);
});
