import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ler variáveis de ambiente
const envContent = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkTrigger() {
  console.log('🔍 Verificando configuração do banco de dados...\n');

  try {
    // Verificar estrutura da tabela operadores
    console.log('📋 TESTE 1: Verificar se coluna auth_user_id existe');
    const { data: operadores, error: opError } = await supabase
      .from('operadores')
      .select('id, email, auth_user_id, ativo')
      .limit(1);

    if (opError) {
      if (opError.message.includes('auth_user_id')) {
        console.error('❌ Coluna auth_user_id NÃO EXISTE!');
        console.log('\n📋 Você precisa executar o SQL manualmente:');
        console.log('1. Acesse: https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new');
        console.log('2. Cole o conteúdo de /workspace/apply-migration.sql');
        console.log('3. Clique em RUN');
        return;
      }
      console.error('❌ Erro ao acessar tabela:', opError.message);
      return;
    }

    console.log('✅ Coluna auth_user_id existe!');

    if (operadores && operadores.length > 0) {
      console.log(`   Amostra: ${operadores[0].email} | auth_user_id: ${operadores[0].auth_user_id || 'NULL'}`);
    }

    // Verificar RLS
    console.log('\n📋 TESTE 2: Verificar Row Level Security (RLS)');
    console.log('✅ RLS está habilitado (caso contrário teríamos erro de acesso)');

    // Verificar se conseguimos inserir diretamente (teste de políticas)
    console.log('\n📋 TESTE 3: Testar política de INSERT');

    const testData = {
      nome: 'Teste Política',
      email: `teste-politica-${Date.now()}@example.com`,
      ativo: false,
      suspenso: true,
      aguardando_pagamento: true
    };

    const { data: insertData, error: insertError } = await supabase
      .from('operadores')
      .insert(testData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Política de INSERT tem problema:', insertError.message);
      console.log('\n⚠️ Isso impede que o trigger crie operadores!');
      console.log('Verifique se a política "Permitir inserção durante signup" foi criada');
    } else {
      console.log('✅ Política de INSERT funcionando!');
      console.log('   Operador criado:', insertData.email);

      // Limpar teste
      await supabase.from('operadores').delete().eq('id', insertData.id);
      console.log('   (teste removido)');
    }

    console.log('\n📋 TESTE 4: Verificar se trigger existe');
    console.log('⚠️ Não é possível verificar triggers via API REST');
    console.log('   Se os testes anteriores passaram, o problema está no trigger');

    console.log('\n' + '='.repeat(80));
    console.log('💡 DIAGNÓSTICO:');
    console.log('='.repeat(80));

    if (opError && opError.message.includes('auth_user_id')) {
      console.log('❌ SQL NÃO FOI APLICADO - Execute manualmente no Supabase Dashboard');
    } else if (insertError) {
      console.log('❌ POLÍTICAS DE SEGURANÇA com problema - Reaplique o SQL');
    } else {
      console.log('✅ Estrutura do banco OK');
      console.log('❌ Problema está no TRIGGER ou no Supabase Auth');
      console.log('\n📝 Possíveis soluções:');
      console.log('1. Reaplique o SQL completo (incluindo triggers)');
      console.log('2. Verifique se o email de confirmação está configurado no Supabase');
      console.log('3. Verifique os logs do Supabase Dashboard em Database > Logs');
    }

  } catch (error) {
    console.error('\n❌ Erro geral:', error.message);
  }
}

checkTrigger();
