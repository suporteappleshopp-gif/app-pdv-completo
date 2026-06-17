import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log('Removendo coluna itens da tabela vendas...');

// Verificar se coluna existe primeiro
const { rows: cols } = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='vendas' AND column_name='itens'
`);

if (cols.length === 0) {
  console.log('Coluna itens não existe, nada a fazer.');
} else {
  await client.query(`ALTER TABLE vendas DROP COLUMN IF EXISTS itens`);
  console.log('✅ Coluna itens removida com sucesso!');
}

// Recarregar schema cache
await client.query(`NOTIFY pgrst, 'reload schema'`);
console.log('✅ Schema cache recarregado.');

// Confirmar schema atual
const { rows } = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='vendas'
  ORDER BY ordinal_position
`);
console.log('Colunas atuais de vendas:', rows.map(r => r.column_name).join(', '));

await client.end();
