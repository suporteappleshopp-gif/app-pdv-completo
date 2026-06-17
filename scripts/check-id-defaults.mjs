import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const { rows } = await client.query(`
  SELECT table_name, column_name, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('movimentacoes_caixa','movimentacoes_estoque','registros_caixa','trocas_extornos')
    AND column_name = 'id'
  ORDER BY table_name
`);
console.log(JSON.stringify(rows, null, 2));
await client.end();
