import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const { rows } = await client.query(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'vendas'
  ORDER BY ordinal_position
`);
console.log('Colunas da tabela vendas:');
rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}, nullable=${r.is_nullable}, default=${r.column_default}`));
await client.end();
