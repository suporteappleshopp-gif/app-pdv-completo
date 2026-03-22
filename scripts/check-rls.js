const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

client.connect().then(async () => {
  console.log('=== RLS STATUS ===');
  const rls = await client.query(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('lojas', 'movimentacoes_estoque', 'produtos', 'operadores', 'notas_fiscais', 'itens_nota_fiscal')
    ORDER BY tablename
  `);
  console.log(JSON.stringify(rls.rows, null, 2));

  console.log('\n=== POLICIES ===');
  const policies = await client.query(`
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('lojas', 'movimentacoes_estoque', 'produtos', 'operadores', 'notas_fiscais', 'itens_nota_fiscal')
    ORDER BY tablename, policyname
  `);
  console.log(JSON.stringify(policies.rows, null, 2));

  console.log('\n=== LOJAS TABLE STRUCTURE ===');
  const lojasCols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'lojas' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  console.log(JSON.stringify(lojasCols.rows, null, 2));

  console.log('\n=== MOVIMENTACOES STRUCTURE ===');
  const movCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'movimentacoes_estoque' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  console.log(JSON.stringify(movCols.rows, null, 2));

  console.log('\n=== SAMPLE LOJAS ===');
  const lojas = await client.query(`SELECT id, user_id, nome, tipo, ativo FROM lojas LIMIT 10`);
  console.log(JSON.stringify(lojas.rows, null, 2));

  await client.end();
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
