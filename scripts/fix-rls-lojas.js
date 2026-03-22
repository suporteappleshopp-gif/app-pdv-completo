const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

client.connect().then(async () => {
  console.log('Aplicando RLS corretas nas tabelas lojas, movimentacoes_estoque, notas_fiscais, itens_nota_fiscal e produtos...');

  // ==============================================================
  // LOJAS - Cada usuário vê/gerencia apenas suas próprias lojas
  // user_id na tabela lojas é TEXT (id do operador), não auth.uid()
  // Por isso usamos: user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
  // ==============================================================
  await client.query(`DROP POLICY IF EXISTS "lojas_all" ON lojas`);

  await client.query(`
    CREATE POLICY "lojas_select_proprio" ON lojas
    FOR SELECT USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  await client.query(`
    CREATE POLICY "lojas_insert_proprio" ON lojas
    FOR INSERT WITH CHECK (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
    )
  `);

  await client.query(`
    CREATE POLICY "lojas_update_proprio" ON lojas
    FOR UPDATE USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  await client.query(`
    CREATE POLICY "lojas_delete_proprio" ON lojas
    FOR DELETE USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  console.log('✅ lojas: políticas RLS aplicadas');

  // ==============================================================
  // MOVIMENTACOES_ESTOQUE - Usuário vê apenas suas próprias
  // ==============================================================
  await client.query(`DROP POLICY IF EXISTS "mov_estoque_all" ON movimentacoes_estoque`);

  await client.query(`
    CREATE POLICY "mov_estoque_select_proprio" ON movimentacoes_estoque
    FOR SELECT USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  await client.query(`
    CREATE POLICY "mov_estoque_insert_proprio" ON movimentacoes_estoque
    FOR INSERT WITH CHECK (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
    )
  `);

  await client.query(`
    CREATE POLICY "mov_estoque_update_proprio" ON movimentacoes_estoque
    FOR UPDATE USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  await client.query(`
    CREATE POLICY "mov_estoque_delete_proprio" ON movimentacoes_estoque
    FOR DELETE USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  console.log('✅ movimentacoes_estoque: políticas RLS aplicadas');

  // ==============================================================
  // NOTAS_FISCAIS - Usuário vê apenas suas próprias
  // ==============================================================
  await client.query(`DROP POLICY IF EXISTS "notas_all" ON notas_fiscais`);

  await client.query(`
    CREATE POLICY "notas_select_proprio" ON notas_fiscais
    FOR SELECT USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  await client.query(`
    CREATE POLICY "notas_insert_proprio" ON notas_fiscais
    FOR INSERT WITH CHECK (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
    )
  `);

  await client.query(`
    CREATE POLICY "notas_update_proprio" ON notas_fiscais
    FOR UPDATE USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  await client.query(`
    CREATE POLICY "notas_delete_proprio" ON notas_fiscais
    FOR DELETE USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  console.log('✅ notas_fiscais: políticas RLS aplicadas');

  // ==============================================================
  // ITENS_NOTA_FISCAL - Usuário vê apenas seus próprios itens
  // ==============================================================
  await client.query(`DROP POLICY IF EXISTS "itens_nota_all" ON itens_nota_fiscal`);

  await client.query(`
    CREATE POLICY "itens_nota_select_proprio" ON itens_nota_fiscal
    FOR SELECT USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  await client.query(`
    CREATE POLICY "itens_nota_insert_proprio" ON itens_nota_fiscal
    FOR INSERT WITH CHECK (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
    )
  `);

  await client.query(`
    CREATE POLICY "itens_nota_update_proprio" ON itens_nota_fiscal
    FOR UPDATE USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  await client.query(`
    CREATE POLICY "itens_nota_delete_proprio" ON itens_nota_fiscal
    FOR DELETE USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  console.log('✅ itens_nota_fiscal: políticas RLS aplicadas');

  // ==============================================================
  // PRODUTOS - Corrigir duplicata e garantir isolamento por usuário
  // ==============================================================
  await client.query(`DROP POLICY IF EXISTS "produtos_all" ON produtos`);
  await client.query(`DROP POLICY IF EXISTS "public_all_produtos" ON produtos`);

  await client.query(`
    CREATE POLICY "produtos_select_proprio" ON produtos
    FOR SELECT USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  await client.query(`
    CREATE POLICY "produtos_insert_proprio" ON produtos
    FOR INSERT WITH CHECK (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
    )
  `);

  await client.query(`
    CREATE POLICY "produtos_update_proprio" ON produtos
    FOR UPDATE USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  await client.query(`
    CREATE POLICY "produtos_delete_proprio" ON produtos
    FOR DELETE USING (
      user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
    )
  `);

  console.log('✅ produtos: políticas RLS corrigidas (removida duplicata)');

  // Verificar resultado final
  const result = await client.query(`
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('lojas', 'movimentacoes_estoque', 'notas_fiscais', 'itens_nota_fiscal', 'produtos')
    ORDER BY tablename, policyname
  `);

  console.log('\n=== POLÍTICAS FINAIS ===');
  console.log(JSON.stringify(result.rows, null, 2));

  await client.end();
  console.log('\n✅ Todas as políticas RLS foram aplicadas com sucesso!');
}).catch(e => {
  console.error('Erro:', e.message);
  process.exit(1);
});
