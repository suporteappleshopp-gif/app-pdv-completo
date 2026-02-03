import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function aplicarMigracao() {
  console.log('🔧 Aplicando migração: adicionar mercadopago_payment_id...');

  try {
    // Executar SQL para adicionar a coluna
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Adicionar coluna para armazenar o ID do pagamento do MercadoPago
        ALTER TABLE solicitacoes_renovacao
        ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

        -- Criar índice para buscar por payment_id
        CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_payment_id
        ON solicitacoes_renovacao(mercadopago_payment_id);
      `
    });

    if (error) {
      console.error('❌ Erro ao aplicar migração:', error);

      // Tentar método alternativo usando SQL direto
      console.log('🔄 Tentando método alternativo...');

      const { error: altError } = await supabase
        .from('solicitacoes_renovacao')
        .select('mercadopago_payment_id')
        .limit(1);

      if (altError && altError.message.includes('column')) {
        console.log('✅ A coluna não existe, vou adicioná-la via SQL direto...');

        // Como não temos acesso direto ao SQL, vamos criar uma função temporária
        const createFunction = await supabase.rpc('exec_sql', {
          sql: `
            CREATE OR REPLACE FUNCTION add_mercadopago_payment_id_column()
            RETURNS void AS $$
            BEGIN
              ALTER TABLE solicitacoes_renovacao ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;
              CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_payment_id ON solicitacoes_renovacao(mercadopago_payment_id);
            END;
            $$ LANGUAGE plpgsql;
          `
        });

        if (createFunction.error) {
          console.error('❌ Não foi possível criar função:', createFunction.error);
          console.log('⚠️ Você precisa executar o SQL manualmente no Supabase Dashboard:');
          console.log(`
            ALTER TABLE solicitacoes_renovacao
            ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

            CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_payment_id
            ON solicitacoes_renovacao(mercadopago_payment_id);
          `);
          return;
        }

        // Executar a função
        const execute = await supabase.rpc('add_mercadopago_payment_id_column');

        if (execute.error) {
          console.error('❌ Erro ao executar função:', execute.error);
        } else {
          console.log('✅ Coluna adicionada com sucesso!');
        }
      } else {
        console.log('✅ A coluna já existe!');
      }
    } else {
      console.log('✅ Migração aplicada com sucesso!');
    }
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
  }
}

aplicarMigracao();
