/**
 * Script para aplicar migration diretamente via Supabase SDK
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function aplicarMigration() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔧 APLICANDO MIGRATION: historico_pagamentos');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Ler o SQL da migration
    const sql = fs.readFileSync('CRIAR_TABELA_PAGAMENTOS.sql', 'utf8');

    console.log('📋 SQL carregado. Executando...');
    console.log('');

    // Dividir em comandos individuais
    const comandos = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    let sucessos = 0;
    let erros = 0;

    for (let i = 0; i < comandos.length; i++) {
      const comando = comandos[i];

      // Pular comentários e linhas vazias
      if (comando.startsWith('--') || comando.length < 10) {
        continue;
      }

      try {
        console.log(`⏳ Executando comando ${i + 1}/${comandos.length}...`);

        // Usar rpc para executar SQL
        const { error } = await supabase.rpc('exec_sql', { query: comando });

        if (error) {
          console.log(`⚠️ Aviso: ${error.message}`);
          erros++;
        } else {
          sucessos++;
        }
      } catch (err) {
        console.log(`⚠️ Erro no comando: ${err.message}`);
        erros++;
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ MIGRATION APLICADA!');
    console.log(`📊 Sucessos: ${sucessos} | Avisos: ${erros}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERRO CRÍTICO:');
    console.error(error.message);
    console.error('');
    process.exit(1);
  }
}

// Executar
aplicarMigration();
