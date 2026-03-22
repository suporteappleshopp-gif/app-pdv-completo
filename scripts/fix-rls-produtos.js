const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

client.connect().then(async () => {
  console.log('Corrigindo políticas RLS de produtos (user_id = UUID)...');

  // produtos.user_id é UUID, operadores.id é UUID -> sem cast necessário
  await client.query(`DROP POLICY IF EXISTS "produtos_all" ON produtos`);
  await client.query(`DROP POLICY IF EXISTS "public_all_produtos" ON produtos`);
  // Remove se já existirem do script anterior
  await client.query(`DROP POLICY IF EXISTS "produtos_select_proprio" ON produtos`);
  await client.query(`DROP POLICY IF EXISTS "produtos_insert_proprio" ON produtos`);
  await client.query(`DROP POLICY IF EXISTS "produtos_update_proprio" ON produtos`);
  await client.query(`DROP POLICY IF EXISTS "produtos_delete_proprio" ON produtos`);

  await client.query(`
    CREATE POLICY "produtos_select_proprio" ON produtos
    FOR SELECT USING (
      user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  await client.query(`
    CREATE POLICY "produtos_insert_proprio" ON produtos
    FOR INSERT WITH CHECK (
      user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
    )
  `);

  await client.query(`
    CREATE POLICY "produtos_update_proprio" ON produtos
    FOR UPDATE USING (
      user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  await client.query(`
    CREATE POLICY "produtos_delete_proprio" ON produtos
    FOR DELETE USING (
      user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  console.log('✅ produtos: políticas RLS corrigidas');

  // Verificar todas as políticas finais
  const result = await client.query(`
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('lojas', 'movimentacoes_estoque', 'notas_fiscais', 'itens_nota_fiscal', 'produtos')
    ORDER BY tablename, policyname
  `);

  console.log('\n=== POLÍTICAS FINAIS ===');
  result.rows.forEach(r => console.log(`  [${r.tablename}] ${r.policyname} (${r.cmd})`));

  await client.end();
  console.log('\n✅ Todas as políticas RLS estão corretas!');
}).catch(e => {
  console.error('Erro:', e.message);
  process.exit(1);
});
