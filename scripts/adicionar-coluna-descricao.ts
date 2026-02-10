import { Client } from 'pg';

async function adicionarColunaDescricao() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!\n');

    const sql = `
      -- Adicionar coluna descricao à tabela ganhos_admin
      ALTER TABLE ganhos_admin
      ADD COLUMN IF NOT EXISTS descricao TEXT;

      -- Também renomear dias_assinatura para dias_comprados para padronizar
      ALTER TABLE ganhos_admin
      ADD COLUMN IF NOT EXISTS dias_comprados INTEGER;

      -- Copiar dados de dias_assinatura para dias_comprados
      UPDATE ganhos_admin
      SET dias_comprados = dias_assinatura
      WHERE dias_comprados IS NULL AND dias_assinatura IS NOT NULL;
    `;

    console.log('🚀 Executando SQL...\n');
    await client.query(sql);
    console.log('✅ Coluna descricao adicionada com sucesso!');
    console.log('✅ Coluna dias_comprados adicionada e populada!');

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

adicionarColunaDescricao();
