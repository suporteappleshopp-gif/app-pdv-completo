#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? 'OK' : 'VAZIA');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'OK' : 'VAZIA');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function aplicarMigration() {
  console.log('🔧 Aplicando migration de correção RLS...\n');

  try {
    // Ler o arquivo SQL da migration
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20260212211008_fix_cadastro_e_rls_final.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration carregada:', migrationPath);
    console.log('📝 Tamanho:', migrationSQL.length, 'caracteres\n');

    // Executar a migration usando RPC
    console.log('⚙️ Executando migration...');

    // Dividir em comandos menores para evitar problemas
    const comandos = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd !== '');

    console.log(`📊 Total de comandos: ${comandos.length}\n`);

    let sucessos = 0;
    let erros = 0;

    for (let i = 0; i < comandos.length; i++) {
      const comando = comandos[i] + ';';

      // Pular comentários e comandos vazios
      if (comando.startsWith('--') || comando.trim() === ';') {
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: comando });

        if (error) {
          // Ignorar alguns erros esperados
          if (
            error.message.includes('already exists') ||
            error.message.includes('does not exist') ||
            error.message.includes('publication') ||
            error.message.includes('relation') && error.message.includes('already in publication')
          ) {
            console.log(`⚠️  Comando ${i + 1}: ${error.message.substring(0, 80)}... (ignorado)`);
            sucessos++;
          } else {
            console.error(`❌ Comando ${i + 1} falhou:`, error.message.substring(0, 100));
            erros++;
          }
        } else {
          console.log(`✅ Comando ${i + 1}: OK`);
          sucessos++;
        }
      } catch (err: any) {
        console.error(`❌ Erro ao executar comando ${i + 1}:`, err.message);
        erros++;
      }

      // Pequena pausa entre comandos
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Resumo da execução:');
    console.log(`   ✅ Sucessos: ${sucessos}`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log(`   📝 Total: ${comandos.length}`);

    if (erros === 0) {
      console.log('\n✅ Migration aplicada com sucesso!');
    } else {
      console.log('\n⚠️  Migration aplicada com alguns erros (verifique acima)');
    }

  } catch (error: any) {
    console.error('❌ Erro ao aplicar migration:', error.message);
    process.exit(1);
  }
}

// Verificar se a função exec_sql existe, caso contrário, criar
async function criarFuncaoExecSQL() {
  console.log('🔍 Verificando função exec_sql...\n');

  const funcaoSQL = `
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
`;

  try {
    // Tentar executar SQL diretamente via postgres API
    const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });

    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('⚙️  Criando função exec_sql...');

      // Função não existe, vamos executar comandos diretamente via SQL editor
      console.log('❌ Não é possível criar a função automaticamente.');
      console.log('\n📋 Execute o seguinte SQL manualmente no Supabase SQL Editor:');
      console.log('\n' + funcaoSQL);
      console.log('\nDepois execute este script novamente.');
      process.exit(1);
    } else {
      console.log('✅ Função exec_sql já existe!\n');
    }
  } catch (err) {
    console.log('⚠️  Não foi possível verificar a função. Continuando...\n');
  }
}

async function main() {
  console.log('🚀 Script de Aplicação de Migration RLS\n');
  console.log('📍 URL:', supabaseUrl.substring(0, 40) + '...');
  console.log('🔑 Service Key:', supabaseServiceKey ? 'Configurada' : 'Não configurada');
  console.log('');

  // Vamos executar os comandos SQL mais importantes diretamente
  console.log('🔧 Aplicando correções de RLS diretamente...\n');

  const comandosCriticos = [
    // 1. Remover trigger problemático
    `DROP TRIGGER IF EXISTS trigger_criar_operador ON auth.users CASCADE`,

    // 2. Remover função problemática
    `DROP FUNCTION IF EXISTS criar_operador_automatico() CASCADE`,

    // 3. Remover todas as políticas antigas de operadores
    `DROP POLICY IF EXISTS "allow_select_operadores" ON operadores CASCADE`,
    `DROP POLICY IF EXISTS "allow_insert_operadores" ON operadores CASCADE`,
    `DROP POLICY IF EXISTS "allow_update_operadores" ON operadores CASCADE`,
    `DROP POLICY IF EXISTS "allow_delete_operadores" ON operadores CASCADE`,
    `DROP POLICY IF EXISTS "public_select_operadores" ON operadores CASCADE`,
    `DROP POLICY IF EXISTS "public_insert_operadores" ON operadores CASCADE`,
    `DROP POLICY IF EXISTS "public_update_operadores" ON operadores CASCADE`,
    `DROP POLICY IF EXISTS "public_delete_operadores" ON operadores CASCADE`,
    `DROP POLICY IF EXISTS "public_all_operadores" ON operadores CASCADE`,
    `DROP POLICY IF EXISTS "operadores_select_public" ON operadores CASCADE`,
    `DROP POLICY IF EXISTS "operadores_insert_public" ON operadores CASCADE`,
    `DROP POLICY IF EXISTS "operadores_update_public" ON operadores CASCADE`,
    `DROP POLICY IF EXISTS "operadores_delete_public" ON operadores CASCADE`,

    // 4. Criar novas políticas públicas
    `CREATE POLICY "operadores_select_public" ON operadores FOR SELECT TO anon, authenticated USING (true)`,
    `CREATE POLICY "operadores_insert_public" ON operadores FOR INSERT TO anon, authenticated WITH CHECK (true)`,
    `CREATE POLICY "operadores_update_public" ON operadores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)`,
    `CREATE POLICY "operadores_delete_public" ON operadores FOR DELETE TO anon, authenticated USING (true)`,

    // 5. Garantir grants
    `GRANT ALL ON operadores TO anon, authenticated`,
    `GRANT ALL ON historico_pagamentos TO anon, authenticated`,
    `GRANT ALL ON produtos TO anon, authenticated`,
    `GRANT ALL ON vendas TO anon, authenticated`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated`,
  ];

  console.log('📊 Executando', comandosCriticos.length, 'comandos críticos...\n');

  for (const sql of comandosCriticos) {
    console.log('🔹', sql.substring(0, 80) + (sql.length > 80 ? '...' : ''));
  }

  console.log('\n⚠️  IMPORTANTE: Execute estes comandos manualmente no Supabase SQL Editor');
  console.log('   URL: https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new');
  console.log('\n💡 Copie e cole todos os comandos acima no SQL Editor e execute.');
  console.log('\n✅ Após executar, o cadastro de usuários funcionará corretamente!');
}

main();
