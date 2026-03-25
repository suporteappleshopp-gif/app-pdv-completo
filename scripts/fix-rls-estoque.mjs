import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  console.log('Conectado ao banco de dados.');

  // As tabelas notas_fiscais, itens_nota_fiscal, movimentacoes_estoque, contas_pagar, lojas
  // têm user_id como TEXT, enquanto operadores.id é UUID.
  // Por isso precisamos fazer cast: (SELECT id FROM operadores ...) ::text
  // Além disso, as políticas de INSERT não tinham WITH CHECK — isso bloqueia todos os INSERTs!

  const sql = `
-- =============================================
-- CORRIGIR RLS: Políticas de INSERT com WITH CHECK
-- user_id é TEXT nessas tabelas, então fazemos cast para text
-- =============================================

-- 1. NOTAS_FISCAIS
DROP POLICY IF EXISTS "notas_insert_proprio" ON notas_fiscais;
DROP POLICY IF EXISTS "notas_fiscais_insert" ON notas_fiscais;

CREATE POLICY "notas_insert_proprio" ON notas_fiscais FOR INSERT
  WITH CHECK (
    user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
  );

-- 2. ITENS_NOTA_FISCAL
DROP POLICY IF EXISTS "itens_nota_insert_proprio" ON itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_fiscal_insert" ON itens_nota_fiscal;

CREATE POLICY "itens_nota_insert_proprio" ON itens_nota_fiscal FOR INSERT
  WITH CHECK (
    user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
  );

-- 3. MOVIMENTACOES_ESTOQUE
DROP POLICY IF EXISTS "mov_estoque_insert_proprio" ON movimentacoes_estoque;
DROP POLICY IF EXISTS "movimentacoes_estoque_insert" ON movimentacoes_estoque;

CREATE POLICY "mov_estoque_insert_proprio" ON movimentacoes_estoque FOR INSERT
  WITH CHECK (
    user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
  );

-- 4. CONTAS_PAGAR - já tem policy "contas_pagar_all" com true, mas vamos garantir INSERT separado também
DROP POLICY IF EXISTS "contas_pagar_insert" ON contas_pagar;

CREATE POLICY "contas_pagar_insert" ON contas_pagar FOR INSERT
  WITH CHECK (
    user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
  );

-- 5. LOJAS
DROP POLICY IF EXISTS "lojas_insert_proprio" ON lojas;
DROP POLICY IF EXISTS "lojas_insert" ON lojas;

CREATE POLICY "lojas_insert_proprio" ON lojas FOR INSERT
  WITH CHECK (
    user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
  );

-- 6. PRODUTOS - user_id é UUID, corrigir política de INSERT
DROP POLICY IF EXISTS "produtos_insert_proprio" ON produtos;
DROP POLICY IF EXISTS "Usuário pode inserir próprios produtos" ON produtos;

CREATE POLICY "produtos_insert_proprio" ON produtos FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
  );
  `;

  try {
    await client.query(sql);
    console.log('✅ Políticas RLS de INSERT corrigidas com sucesso!');
    console.log('Tabelas corrigidas:');
    console.log('  - notas_fiscais: INSERT WITH CHECK adicionado');
    console.log('  - itens_nota_fiscal: INSERT WITH CHECK adicionado');
    console.log('  - movimentacoes_estoque: INSERT WITH CHECK adicionado');
    console.log('  - contas_pagar: INSERT WITH CHECK adicionado');
    console.log('  - lojas: INSERT WITH CHECK adicionado');
    console.log('  - produtos: INSERT WITH CHECK corrigido');
  } catch (err) {
    console.error('❌ Erro:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

run();
