const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

client.connect().then(async () => {
  // Check user_id column type in produtos
  const cols = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND column_name = 'user_id'
    AND table_name IN ('produtos', 'lojas', 'movimentacoes_estoque', 'notas_fiscais', 'itens_nota_fiscal', 'operadores')
    ORDER BY table_name
  `);
  console.log('user_id column types:', JSON.stringify(cols.rows, null, 2));

  // Check operadores id type
  const op = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'operadores'
    ORDER BY ordinal_position
  `);
  console.log('operadores columns:', JSON.stringify(op.rows, null, 2));

  await client.end();
}).catch(e => console.error(e.message));
