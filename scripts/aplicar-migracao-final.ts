import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxODgzMiwiZXhwIjoyMDg2MTk0ODMyfQ.TD5QfoLOn3j6o3hG04nRbtAF9maDGv4HNDazvpKSlJ0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function aplicarMigracaoFinal() {
  console.log('🚀 Aplicando migração final de correção de RLS...\n');

  const migracaoSQL = fs.readFileSync(
    '/workspace/supabase/migrations/20260210165219_disable_auth_trigger_fix_rls.sql',
    'utf-8'
  );

  // Separar comandos SQL
  const comandos = migracaoSQL
    .split('\n')
    .filter(linha => !linha.trim().startsWith('--') && linha.trim() !== '')
    .join('\n')
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0);

  console.log(`📝 Total de comandos a executar: ${comandos.length}\n`);

  let sucessos = 0;
  let falhas = 0;

  for (let i = 0; i < comandos.length; i++) {
    const comando = comandos[i] + ';';
    const preview = comando.substring(0, 80).replace(/\s+/g, ' ');

    console.log(`[${i + 1}/${comandos.length}] ${preview}...`);

    try {
      // Executar usando REST API diretamente
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql: comando })
      });

      if (response.ok) {
        console.log('✅ OK\n');
        sucessos++;
      } else {
        const error = await response.json();
        console.log(`⚠️ Erro: ${error.message}\n`);
        falhas++;
      }
    } catch (error: any) {
      console.log(`⚠️ Erro: ${error.message}\n`);
      falhas++;
    }

    // Pequeno delay entre comandos
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n📊 Resultado: ${sucessos} sucessos, ${falhas} falhas`);

  if (sucessos > 0) {
    console.log('\n✅ Migração aplicada! Testando cadastro...\n');
    await testarCadastro();
  }
}

async function testarCadastro() {
  const supabaseAnon = createClient(
    supabaseUrl,
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MTg4MzIsImV4cCI6MjA4NjE5NDgzMn0.VybuY1x3xhFt7Ip4rSCHRPs9wApdto32MgXn_UtlkD4'
  );

  const emailTeste = `teste${Date.now()}@exemplo.com`;

  console.log('🧪 Testando cadastro de usuário...');
  console.log(`Email: ${emailTeste}\n`);

  const { data, error } = await supabaseAnon
    .from('operadores')
    .insert({
      email: emailTeste,
      nome: 'Teste',
      senha: 'senha123',
      is_admin: false,
      ativo: false,
      suspenso: true,
      aguardando_pagamento: true,
      forma_pagamento: 'pix',
      valor_mensal: 59.90,
      dias_assinatura: 60,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ CADASTRO FALHOU:', error);
    console.log('\n⚠️ Você precisará executar o SQL manualmente no dashboard do Supabase.');
    console.log('O arquivo está em: EXECUTAR_NO_SUPABASE_DASHBOARD.sql');
  } else {
    console.log('✅ SUCESSO! Operador criado:', data);
    console.log('\n🎉 O cadastro público está funcionando!');
  }
}

aplicarMigracaoFinal();
