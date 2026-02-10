import { Client } from 'pg';
import { addDays } from 'date-fns';

async function corrigirUsuario() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!\n');

    // 1. Adicionar coluna ultima_atividade se não existir
    console.log('1️⃣ Adicionando coluna ultima_atividade...');
    await client.query(`
      ALTER TABLE operadores
      ADD COLUMN IF NOT EXISTS ultima_atividade TIMESTAMP DEFAULT NOW();
    `);
    console.log('✅ Coluna adicionada!\n');

    // 2. Ativar usuário joelmamoura2
    console.log('2️⃣ Ativando usuário joelmamoura2@icloud.com...');

    const diasComprados = 60;
    const dataVencimento = addDays(new Date(), diasComprados);
    const dataPagamento = new Date();

    const result = await client.query(`
      UPDATE operadores
      SET
        ativo = true,
        suspenso = false,
        aguardando_pagamento = false,
        data_pagamento = $1,
        data_proximo_vencimento = $2,
        dias_assinatura = $3,
        ultima_atividade = NOW()
      WHERE email = 'joelmamoura2@icloud.com'
      RETURNING *;
    `, [dataPagamento.toISOString(), dataVencimento.toISOString(), diasComprados]);

    if (result.rows.length === 0) {
      console.error('❌ Usuário não encontrado!');
      return;
    }

    const usuario = result.rows[0];
    console.log('✅ Usuário ativado com sucesso!');
    console.log('   Email:', usuario.email);
    console.log('   Nome:', usuario.nome);
    console.log('   Ativo:', usuario.ativo);
    console.log('   Suspenso:', usuario.suspenso);
    console.log('   Aguardando Pagamento:', usuario.aguardando_pagamento);
    console.log('   Dias Assinatura:', usuario.dias_assinatura);
    console.log('   Data Vencimento:', new Date(usuario.data_proximo_vencimento).toLocaleDateString('pt-BR'));
    console.log('   Data Pagamento:', new Date(usuario.data_pagamento).toLocaleDateString('pt-BR'));

    console.log('\n🎉 PRONTO! O usuário está ativo e pode usar o app por 60 dias!');

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

corrigirUsuario();
