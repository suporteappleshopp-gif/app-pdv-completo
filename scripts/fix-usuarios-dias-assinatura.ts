import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUsuarios() {
  console.log('🔄 Corrigindo dados de assinatura dos usuários...\n');

  try {
    // 1. Buscar todos os operadores (exceto admins)
    console.log('1️⃣ Buscando operadores...');
    const { data: operadores, error: fetchError } = await supabase
      .from('operadores')
      .select('*')
      .eq('is_admin', false);

    if (fetchError) {
      console.error('❌ Erro ao buscar operadores:', fetchError);
      return;
    }

    if (!operadores || operadores.length === 0) {
      console.log('⚠️ Nenhum operador encontrado.');
      return;
    }

    console.log(`✅ Encontrados ${operadores.length} operador(es)\n`);

    // 2. Corrigir cada operador
    let corrigidos = 0;
    let erros = 0;

    for (const op of operadores) {
      console.log(`📝 Verificando: ${op.nome} (${op.email})`);

      const updates: any = {};
      let needsUpdate = false;

      // Verificar forma_pagamento
      if (!op.forma_pagamento) {
        // Se não tem forma_pagamento, verificar valor_mensal
        if (op.valor_mensal === 59.90) {
          updates.forma_pagamento = 'pix';
          updates.dias_assinatura = 60;
          needsUpdate = true;
          console.log('   → Definindo: PIX - 60 dias');
        } else if (op.valor_mensal === 149.70) {
          updates.forma_pagamento = 'cartao';
          updates.dias_assinatura = 180;
          needsUpdate = true;
          console.log('   → Definindo: Cartão - 180 dias');
        }
      } else if (!op.dias_assinatura) {
        // Tem forma_pagamento mas não tem dias_assinatura
        if (op.forma_pagamento === 'pix') {
          updates.dias_assinatura = 60;
          updates.valor_mensal = 59.90;
          needsUpdate = true;
          console.log('   → Definindo: 60 dias (PIX)');
        } else if (op.forma_pagamento === 'cartao') {
          updates.dias_assinatura = 180;
          updates.valor_mensal = 149.70;
          needsUpdate = true;
          console.log('   → Definindo: 180 dias (Cartão)');
        }
      }

      // Aplicar atualizações se necessário
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('operadores')
          .update(updates)
          .eq('id', op.id);

        if (updateError) {
          console.error(`   ❌ Erro ao atualizar ${op.nome}:`, updateError.message);
          erros++;
        } else {
          console.log(`   ✅ ${op.nome} corrigido!`);
          corrigidos++;
        }
      } else {
        console.log('   ✓ Já está correto');
      }

      console.log('');
    }

    console.log('🎉 CORREÇÃO CONCLUÍDA!\n');
    console.log('📋 Resumo:');
    console.log(`   ✓ ${corrigidos} operador(es) corrigido(s)`);
    console.log(`   ✓ ${operadores.length - corrigidos - erros} já estava(m) correto(s)`);
    if (erros > 0) {
      console.log(`   ✗ ${erros} erro(s)`);
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error);
    process.exit(1);
  }
}

fixUsuarios();
