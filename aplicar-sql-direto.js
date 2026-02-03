const https = require('https');

const supabaseUrl = 'https://ynkuovfplntzckecruvk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlua3VvdmZwbG50emNrZWNydXZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ2MDY1MCwiZXhwIjoyMDg1MDM2NjUwfQ.Sr6itq-mdbZX6pFx1CAChdLNRrCJA9VgdUFsxFFNf78';

const sql = `
ALTER TABLE solicitacoes_renovacao
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_payment_id
ON solicitacoes_renovacao(mercadopago_payment_id);
`;

async function executarSQL() {
  console.log('🔧 Executando SQL no Supabase...');

  const data = JSON.stringify({
    query: sql
  });

  const options = {
    hostname: 'ynkuovfplntzckecruvk.supabase.co',
    path: '/rest/v1/rpc/exec_sql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    let body = '';

    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Resposta:', body);

      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('✅ SQL executado com sucesso!');
      } else {
        console.log('⚠️ Não foi possível executar via API. Execute manualmente no Dashboard:');
        console.log(sql);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Erro:', e.message);
    console.log('⚠️ Execute manualmente no Supabase Dashboard:');
    console.log(sql);
  });

  req.write(data);
  req.end();
}

executarSQL();
