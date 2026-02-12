#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executarSQL() {
  console.log('🚀 Executando correção RLS via API do Supabase\n');

  // Ler o arquivo SQL
  const sqlPath = join(process.cwd(), 'supabase', 'migrations', '20260212211008_fix_cadastro_e_rls_final.sql');
  const sqlContent = readFileSync(sqlPath, 'utf-8');

  console.log('📄 Arquivo SQL carregado:', sqlPath);
  console.log('📏 Tamanho:', sqlContent.length, 'caracteres\n');

  // Dividir em comandos individuais
  const comandos = sqlContent
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => {
      // Remover comentários e comandos vazios
      return cmd &&
             !cmd.startsWith('--') &&
             cmd !== '' &&
             !cmd.match(/^-{2,}/); // Linhas só com --
    });

  console.log('📊 Total de comandos SQL:', comandos.length, '\n');

  // Executar cada comando via REST API do Supabase
  let sucessos = 0;
  let erros = 0;
  const errosDetalhes: string[] = [];

  for (let i = 0; i < comandos.length; i++) {
    const comando = comandos[i] + ';';
    const preview = comando.substring(0, 80).replace(/\n/g, ' ');

    try {
      // Usar a REST API do Supabase para executar SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql: comando }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Ignorar alguns erros esperados
        if (
          errorText.includes('already exists') ||
          errorText.includes('does not exist') ||
          errorText.includes('already in publication') ||
          errorText.includes('function') && errorText.includes('does not exist')
        ) {
          console.log(`⚠️  ${i + 1}/${comandos.length}: ${preview}... (ignorado)`);
          sucessos++;
        } else {
          console.error(`❌ ${i + 1}/${comandos.length}: ${preview}...`);
          console.error(`   Erro: ${errorText.substring(0, 100)}`);
          errosDetalhes.push(`Comando ${i + 1}: ${errorText.substring(0, 200)}`);
          erros++;
        }
      } else {
        console.log(`✅ ${i + 1}/${comandos.length}: ${preview}...`);
        sucessos++;
      }
    } catch (err: any) {
      console.error(`❌ ${i + 1}/${comandos.length}: ${preview}...`);
      console.error(`   Erro: ${err.message}`);
      errosDetalhes.push(`Comando ${i + 1}: ${err.message}`);
      erros++;
    }

    // Pausa entre comandos
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMO DA EXECUÇÃO');
  console.log('='.repeat(80));
  console.log(`✅ Sucessos: ${sucessos}`);
  console.log(`❌ Erros: ${erros}`);
  console.log(`📝 Total: ${comandos.length}`);

  if (errosDetalhes.length > 0) {
    console.log('\n⚠️  ERROS ENCONTRADOS:');
    errosDetalhes.forEach(erro => console.log(`   - ${erro}`));
  }

  if (erros === 0) {
    console.log('\n✅ MIGRATION APLICADA COM SUCESSO!');
    console.log('   O app agora deve permitir cadastro e listagem de usuários.');
  } else {
    console.log('\n⚠️  Migration executada com alguns erros.');
    console.log('   Verifique os erros acima e corrija se necessário.');
  }
}

executarSQL();
