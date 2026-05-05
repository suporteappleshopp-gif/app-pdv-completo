import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function fixRLS() {
  const client = await pool.connect();
  try {
    console.log('🔧 Corrigindo RLS da tabela operadores...');

    await client.query(`
      ALTER TABLE IF EXISTS operadores ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "operadores_select_all" ON operadores;
      DROP POLICY IF EXISTS "operadores_insert_auth" ON operadores;
      DROP POLICY IF EXISTS "operadores_update_auth" ON operadores;
      DROP POLICY IF EXISTS "operadores_delete_auth" ON operadores;
      DROP POLICY IF EXISTS "Allow read for authenticated" ON operadores;
      DROP POLICY IF EXISTS "Allow insert for authenticated" ON operadores;
      DROP POLICY IF EXISTS "Allow update for authenticated" ON operadores;
      DROP POLICY IF EXISTS "Operadores podem ver seus dados" ON operadores;
      DROP POLICY IF EXISTS "Operadores podem atualizar seus dados" ON operadores;
      DROP POLICY IF EXISTS "Service role tem acesso total" ON operadores;
      DROP POLICY IF EXISTS "Autenticados podem ver operadores" ON operadores;
      DROP POLICY IF EXISTS "anon pode ler por email para login" ON operadores;
      DROP POLICY IF EXISTS "service_role acesso total operadores" ON operadores;
      DROP POLICY IF EXISTS "Autenticados podem atualizar operadores" ON operadores;
    `);

    await client.query(`
      CREATE POLICY "service_role acesso total operadores"
      ON operadores
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    `);

    await client.query(`
      CREATE POLICY "Autenticados podem ver operadores"
      ON operadores
      FOR SELECT
      TO authenticated
      USING (true);
    `);

    await client.query(`
      CREATE POLICY "Autenticados podem atualizar operadores"
      ON operadores
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = auth_user_id)
      WITH CHECK (auth.uid() = auth_user_id);
    `);

    await client.query(`
      CREATE POLICY "anon pode ler por email para login"
      ON operadores
      FOR SELECT
      TO anon
      USING (true);
    `);

    console.log('✅ RLS corrigido com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixRLS();
