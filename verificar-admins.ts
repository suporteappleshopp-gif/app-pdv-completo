/**
 * 🔍 VERIFICAR ADMINISTRADORES E PROBLEMA COM is_admin
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verificarAdmins() {
  console.log("🔍 VERIFICAÇÃO DE ADMINISTRADORES\n");

  // Verificar estrutura da tabela operadores
  console.log("1. Estrutura da tabela operadores:");
  const { data: operadores, error: erroOp } = await supabase
    .from("operadores")
    .select("*")
    .limit(5);

  if (operadores && operadores.length > 0) {
    console.log("\n   Primeiros 5 operadores:");
    operadores.forEach((op: any) => {
      console.log(`\n   ${op.nome} (${op.email})`);
      console.log(`   ID: ${op.id}`);
      console.log(`   is_admin: ${op.is_admin}`);
      console.log(`   role: ${op.role || "N/A"}`);
      console.log(`   ativo: ${op.ativo}`);
    });

    // Verificar se existe coluna is_admin
    const primeiroOp = operadores[0];
    console.log("\n2. Colunas disponíveis:");
    console.log("  ", Object.keys(primeiroOp).join(", "));

    // Procurar por admins de qualquer forma
    console.log("\n3. Buscando administradores (múltiplas abordagens):");

    // Método 1: is_admin = true
    const { data: admins1, error: erro1 } = await supabase
      .from("operadores")
      .select("*")
      .eq("is_admin", true);
    console.log(`   is_admin = true: ${admins1?.length || 0} encontrados`);

    // Método 2: role = 'admin'
    const { data: admins2, error: erro2 } = await supabase
      .from("operadores")
      .select("*")
      .eq("role", "admin");
    console.log(`   role = 'admin': ${admins2?.length || 0} encontrados`);

    // Método 3: Verificar se a coluna existe
    if (admins1 === null && erro1) {
      console.log("\n   ❌ PROBLEMA: Coluna is_admin não existe ou RLS está bloqueando!");
      console.log("   Erro:", erro1.message);
    }

  } else {
    console.log("   ❌ Nenhum operador encontrado!");
    if (erroOp) {
      console.log("   Erro:", erroOp.message);
    }
  }

  // Verificar solicitações e relacionamento
  console.log("\n4. Verificando solicitações de renovação:");
  const { data: sols, error: erroSol } = await supabase
    .from("solicitacoes_renovacao")
    .select("*")
    .limit(3);

  if (sols) {
    console.log(`   Total: ${sols.length} solicitações`);
    if (sols.length > 0) {
      console.log("\n   Primeira solicitação:");
      const primeira = sols[0];
      console.log("   Colunas:", Object.keys(primeira).join(", "));
      console.log(`   operador_id: ${primeira.operador_id}`);
      console.log(`   status: ${primeira.status}`);

      // Verificar se o operador existe
      const { data: operador, error: erroOpBusca } = await supabase
        .from("operadores")
        .select("id, nome, email")
        .eq("id", primeira.operador_id)
        .single();

      if (operador) {
        console.log(`   ✅ Operador encontrado: ${operador.nome}`);
      } else {
        console.log(`   ❌ Operador NÃO encontrado para ID: ${primeira.operador_id}`);
        if (erroOpBusca) {
          console.log(`   Erro: ${erroOpBusca.message}`);
        }
      }
    }
  } else {
    console.log("   ❌ Erro ao buscar solicitações:", erroSol);
  }
}

verificarAdmins().catch(console.error);
