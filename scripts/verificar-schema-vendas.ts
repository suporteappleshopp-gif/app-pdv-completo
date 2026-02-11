import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verificarSchema() {
  console.log('🔍 VERIFICANDO SCHEMA DA TABELA vendas\n');
  console.log('═'.repeat(60));

  try {
    await client.connect();

    // Buscar colunas da tabela vendas
    const result = await client.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'vendas'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 COLUNAS DA TABELA vendas:\n');
    result.rows.forEach((col: any, i: number) => {
      const nullable = col.is_nullable === 'YES' ? '✅ NULLABLE' : '❌ NOT NULL';
      console.log(`   [${i + 1}] ${col.column_name}`);
      console.log(`       Tipo: ${col.data_type}`);
      console.log(`       ${nullable}`);
      if (col.column_default) {
        console.log(`       Default: ${col.column_default}`);
      }
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
    console.log('═'.repeat(60));
  }
}

verificarSchema();
