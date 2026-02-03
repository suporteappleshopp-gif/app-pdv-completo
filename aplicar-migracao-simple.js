const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ynkuovfplntzckecruvk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlua3VvdmZwbG50emNrZWNydXZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ2MDY1MCwiZXhwIjoyMDg1MDM2NjUwfQ.Sr6itq-mdbZX6pFx1CAChdLNRrCJA9VgdUFsxFFNf78';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function aplicarMigracao() {
  console.log('🔧 Aplicando migração: adicionar mercadopago_payment_id...');

  try {
    // Tentar buscar a coluna para verificar se existe
    const { data, error } = await supabase
      .from('solicitacoes_renovacao')
      .select('mercadopago_payment_id')
      .limit(1);

    if (error) {
      if (error.message.includes('column') || error.message.includes('does not exist')) {
        console.log('❌ A coluna não existe. Execute este SQL no Supabase Dashboard:');
        console.log(`
ALTER TABLE solicitacoes_renovacao
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_payment_id
ON solicitacoes_renovacao(mercadopago_payment_id);
        `);
      } else {
        console.error('❌ Erro:', error.message);
      }
    } else {
      console.log('✅ A coluna mercadopago_payment_id já existe!');
    }
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
  }
}

aplicarMigracao();
