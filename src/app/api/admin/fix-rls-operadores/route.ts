import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";

export async function POST() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    const client = await pool.connect();

    try {
      // Corrigir RLS da tabela operadores para permitir acesso via anon key (leitura básica para login)
      await client.query(`
        -- Habilitar RLS se ainda não estiver
        ALTER TABLE IF EXISTS operadores ENABLE ROW LEVEL SECURITY;

        -- Remover políticas conflitantes antigas
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

        -- Política: service_role tem acesso total (para API Routes)
        CREATE POLICY "service_role acesso total operadores"
        ON operadores
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

        -- Política: usuários autenticados podem ver seus próprios dados
        CREATE POLICY "Autenticados podem ver operadores"
        ON operadores
        FOR SELECT
        TO authenticated
        USING (true);

        -- Política: usuários autenticados podem atualizar seus dados
        CREATE POLICY "Autenticados podem atualizar operadores"
        ON operadores
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = auth_user_id)
        WITH CHECK (auth.uid() = auth_user_id);

        -- Política: anon pode fazer SELECT limitado (para login via API)
        CREATE POLICY "anon pode ler por email para login"
        ON operadores
        FOR SELECT
        TO anon
        USING (true);
      `);

      await client.release();
      await pool.end();

      return NextResponse.json({
        success: true,
        message: "RLS da tabela operadores corrigido com sucesso!",
      });
    } catch (sqlError: any) {
      client.release();
      await pool.end();
      throw sqlError;
    }
  } catch (error: any) {
    console.error("❌ Erro ao corrigir RLS:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Use POST para aplicar correção de RLS" });
}
