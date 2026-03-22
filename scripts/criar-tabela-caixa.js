const { Client } = require('pg');

async function criarTabelaCaixa() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    console.log('Conectado ao banco de dados...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS registros_caixa (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operador_id TEXT NOT NULL,
        operador_nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('abertura', 'fechamento')),
        valor_inicial NUMERIC(10,2) DEFAULT 0,
        valor_final NUMERIC(10,2),
        total_vendas NUMERIC(10,2) DEFAULT 0,
        total_dinheiro NUMERIC(10,2) DEFAULT 0,
        total_credito NUMERIC(10,2) DEFAULT 0,
        total_debito NUMERIC(10,2) DEFAULT 0,
        total_pix NUMERIC(10,2) DEFAULT 0,
        total_outros NUMERIC(10,2) DEFAULT 0,
        quantidade_vendas INTEGER DEFAULT 0,
        observacoes TEXT,
        data_hora TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Tabela registros_caixa criada/verificada com sucesso!');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_registros_caixa_operador ON registros_caixa(operador_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_registros_caixa_tipo ON registros_caixa(tipo);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_registros_caixa_data ON registros_caixa(data_hora);
    `);
    console.log('Índices criados!');

    await client.query(`ALTER TABLE registros_caixa ENABLE ROW LEVEL SECURITY;`);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE tablename = 'registros_caixa' AND policyname = 'Operadores podem ver seus próprios registros'
        ) THEN
          CREATE POLICY "Operadores podem ver seus próprios registros"
          ON registros_caixa FOR SELECT
          TO anon, authenticated
          USING (true);
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE tablename = 'registros_caixa' AND policyname = 'Operadores podem inserir registros'
        ) THEN
          CREATE POLICY "Operadores podem inserir registros"
          ON registros_caixa FOR INSERT
          TO anon, authenticated
          WITH CHECK (true);
        END IF;
      END $$;
    `);

    console.log('RLS e políticas configuradas!');
    console.log('✅ Tabela registros_caixa configurada com sucesso!');
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

criarTabelaCaixa();
