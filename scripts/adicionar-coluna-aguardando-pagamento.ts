import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function adicionarColunaAguardandoPagamento() {
  console.log('🔧 ADICIONANDO COLUNA aguardando_pagamento');
  console.log('════════════════════════════════════════════════════════════\n');

  try {
    // Executar SQL para adicionar a coluna
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Adicionar a coluna aguardando_pagamento (se não existir)
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'operadores'
            AND column_name = 'aguardando_pagamento'
          ) THEN
            ALTER TABLE operadores
            ADD COLUMN aguardando_pagamento BOOLEAN DEFAULT false;

            -- Atualizar operadores suspensos para aguardando_pagamento = true
            UPDATE operadores
            SET aguardando_pagamento = true
            WHERE suspenso = true;

            RAISE NOTICE 'Coluna aguardando_pagamento adicionada com sucesso';
          ELSE
            RAISE NOTICE 'Coluna aguardando_pagamento já existe';
          END IF;
        END $$;
      `
    });

    if (error) {
      console.error('❌ Erro ao executar SQL:', error);

      // Tentar método alternativo: UPDATE direto
      console.log('\n⚠️ Tentando método alternativo...\n');

      // Verificar se a coluna já existe buscando um registro
      const { data: testData, error: testError } = await supabase
        .from('operadores')
        .select('aguardando_pagamento')
        .limit(1);

      if (testError && testError.message.includes('aguardando_pagamento')) {
        console.log('❌ Coluna aguardando_pagamento NÃO existe');
        console.log('📝 É necessário criar a coluna manualmente no Supabase Dashboard');
        console.log('\n🔗 Acesse: Table Editor > operadores > Add Column');
        console.log('   - Nome: aguardando_pagamento');
        console.log('   - Tipo: boolean');
        console.log('   - Default: false');
        return;
      } else {
        console.log('✅ Coluna aguardando_pagamento JÁ EXISTE!');

        // Atualizar operadores suspensos
        const { error: updateError } = await supabase
          .from('operadores')
          .update({ aguardando_pagamento: true })
          .eq('suspenso', true);

        if (updateError) {
          console.error('❌ Erro ao atualizar operadores:', updateError);
        } else {
          console.log('✅ Operadores suspensos atualizados!');
        }
      }
    } else {
      console.log('✅ SQL executado com sucesso!');
      console.log('Resultado:', data);
    }

    // Verificar a estrutura final
    console.log('\n📊 Verificando operadores...\n');
    const { data: operadores, error: opError } = await supabase
      .from('operadores')
      .select('id, email, nome, suspenso, aguardando_pagamento')
      .limit(5);

    if (opError) {
      console.error('❌ Erro ao buscar operadores:', opError);
    } else {
      console.log('✅ Operadores:');
      operadores?.forEach(op => {
        console.log(`   - ${op.email}: suspenso=${op.suspenso}, aguardando_pagamento=${op.aguardando_pagamento}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }

  console.log('\n════════════════════════════════════════════════════════════');
}

adicionarColunaAguardandoPagamento();
