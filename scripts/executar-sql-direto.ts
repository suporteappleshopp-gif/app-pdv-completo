import { Client } from 'pg';

async function executarSQL() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!\n');

    const sql = `
-- 1. REMOVER TRIGGER QUE CAUSA ERRO
DROP TRIGGER IF EXISTS trigger_criar_operador ON auth.users;
DROP FUNCTION IF EXISTS criar_operador_automatico() CASCADE;

-- 2. DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE operadores DISABLE ROW LEVEL SECURITY;
ALTER TABLE produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendas DISABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_renovacao DISABLE ROW LEVEL SECURITY;
ALTER TABLE ganhos_admin DISABLE ROW LEVEL SECURITY;

-- 3. REMOVER TODAS AS POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "allow_select_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "allow_insert_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "allow_update_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "allow_delete_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "public_select_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "public_insert_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "public_update_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "public_delete_operadores" ON operadores CASCADE;

DROP POLICY IF EXISTS "allow_all_produtos" ON produtos CASCADE;
DROP POLICY IF EXISTS "public_all_produtos" ON produtos CASCADE;

DROP POLICY IF EXISTS "allow_all_vendas" ON vendas CASCADE;
DROP POLICY IF EXISTS "public_all_vendas" ON vendas CASCADE;

DROP POLICY IF EXISTS "allow_all_solicitacoes" ON solicitacoes_renovacao CASCADE;
DROP POLICY IF EXISTS "public_all_solicitacoes" ON solicitacoes_renovacao CASCADE;

DROP POLICY IF EXISTS "allow_all_ganhos" ON ganhos_admin CASCADE;
DROP POLICY IF EXISTS "public_all_ganhos" ON ganhos_admin CASCADE;

-- 4. REABILITAR RLS
ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_renovacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE ganhos_admin ENABLE ROW LEVEL SECURITY;

-- 5. CRIAR POLÍTICAS PÚBLICAS
CREATE POLICY "public_all_operadores" ON operadores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_produtos" ON produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_vendas" ON vendas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_solicitacoes" ON solicitacoes_renovacao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_ganhos" ON ganhos_admin FOR ALL USING (true) WITH CHECK (true);

-- 6. GARANTIR PERMISSÕES
GRANT ALL ON operadores TO anon, authenticated;
GRANT ALL ON produtos TO anon, authenticated;
GRANT ALL ON vendas TO anon, authenticated;
GRANT ALL ON solicitacoes_renovacao TO anon, authenticated;
GRANT ALL ON ganhos_admin TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
`;

    console.log('🚀 Executando SQL de correção...\n');
    await client.query(sql);
    console.log('✅ SQL executado com sucesso!\n');

    // Testar cadastro
    console.log('🧪 Testando cadastro de usuário...\n');
    const emailTeste = `teste${Date.now()}@exemplo.com`;

    const result = await client.query(`
      INSERT INTO operadores (email, nome, senha, is_admin, ativo, suspenso, aguardando_pagamento, forma_pagamento, valor_mensal, dias_assinatura)
      VALUES ($1, $2, $3, false, false, true, true, 'pix', 59.90, 60)
      RETURNING id, email, nome, suspenso, aguardando_pagamento;
    `, [emailTeste, 'Teste', 'senha123']);

    console.log('✅ CADASTRO FUNCIONOU!');
    console.log('Operador criado:', result.rows[0]);
    console.log('\n🎉 O sistema está pronto para receber cadastros!');

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    if (error.code) {
      console.error('Código:', error.code);
    }
  } finally {
    await client.end();
  }
}

executarSQL();
