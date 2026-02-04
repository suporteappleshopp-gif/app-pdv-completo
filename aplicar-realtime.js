#!/usr/bin/env node

/**
 * Script para habilitar Realtime nas tabelas de vendas e ganhos
 * Executa: node aplicar-realtime.js
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

async function aplicarRealtime() {
  console.log('🔧 Iniciando configuração de Realtime...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    console.error('   Certifique-se de que existe:');
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

  console.log('═'.repeat(70));
  console.log('📋 INSTRUÇÕES PARA HABILITAR REALTIME');
  console.log('═'.repeat(70));
  console.log('\n⚠️  O Realtime precisa ser habilitado via Dashboard do Supabase.\n');
  console.log('Siga os passos abaixo:\n');
  console.log('1. Acesse: https://supabase.com/dashboard');
  console.log('2. Selecione seu projeto');
  console.log('3. Vá em "Database" → "Replication" no menu lateral');
  console.log('4. Na seção "supabase_realtime", habilite as tabelas:');
  console.log('   ✓ vendas');
  console.log('   ✓ itens_venda');
  console.log('   ✓ ganhos_admin');
  console.log('   ✓ produtos');
  console.log('5. Clique em "Save" para aplicar as mudanças\n');
  console.log('═'.repeat(70));
  console.log('\n💡 Após habilitar, o histórico de vendas e painel de ganhos');
  console.log('   atualizarão automaticamente em tempo real!\n');

  // Verificar se as tabelas existem
  console.log('🔍 Verificando se as tabelas existem...\n');

  const tabelas = ['vendas', 'ganhos_admin', 'produtos', 'itens_venda'];

  for (const tabela of tabelas) {
    try {
      const { data, error } = await supabase
        .from(tabela)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${tabela}: ERRO - ${error.message}`);
      } else {
        console.log(`✅ ${tabela}: Existe e está acessível`);
      }
    } catch (err) {
      console.log(`❌ ${tabela}: ERRO - ${err.message}`);
    }
  }

  console.log('\n✨ Verificação concluída!\n');
}

aplicarRealtime().catch((error) => {
  console.error('❌ Erro fatal:', error.message);
  process.exit(1);
});
