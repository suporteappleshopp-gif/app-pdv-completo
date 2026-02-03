/**
 * ✅ CORRIGIR: Tornar diego admin e testar fluxo completo
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

async function corrigirAdmin() {
  console.log("🔧 CORREÇÃO: Configurar Diego como admin\n");

  // 1. Encontrar Diego
  const { data: diego, error: erroDiego } = await supabase
    .from("operadores")
    .select("*")
    .eq("email", "diegomarqueshm@icloud.com")
    .single();

  if (!diego) {
    console.log("❌ Diego não encontrado!");
    return;
  }

  console.log(`✅ Diego encontrado: ${diego.nome} (${diego.id})`);
  console.log(`   is_admin atual: ${diego.is_admin}`);

  // 2. Tornar Diego admin
  const { data: diegoAtualizado, error: erroUpdate } = await supabase
    .from("operadores")
    .update({ is_admin: true })
    .eq("id", diego.id)
    .select()
    .single();

  if (erroUpdate) {
    console.log("❌ Erro ao atualizar Diego:", erroUpdate.message);
    return;
  }

  console.log(`✅ Diego agora é admin: is_admin = ${diegoAtualizado.is_admin}`);

  // 3. Criar uma solicitação de teste para verificar o fluxo
  console.log("\n🧪 CRIANDO SOLICITAÇÃO DE TESTE...");

  // Encontrar outro usuário (joelma)
  const { data: joelma } = await supabase
    .from("operadores")
    .select("*")
    .eq("email", "joelmamoura2@cloud.com")
    .single();

  if (joelma) {
    console.log(`✅ Usuário de teste: ${joelma.nome}`);

    // Criar solicitação
    const { data: solicitacao, error: erroSol } = await supabase
      .from("solicitacoes_renovacao")
      .insert({
        operador_id: joelma.id,
        forma_pagamento: "pix",
        dias_solicitados: 60,
        valor: 59.90,
        status: "pendente",
      })
      .select()
      .single();

    if (solicitacao) {
      console.log(`✅ Solicitação criada: ${solicitacao.id}`);
      console.log(`   Status: ${solicitacao.status}`);
      console.log(`   Dias: ${solicitacao.dias_solicitados}`);
      console.log(`   Valor: R$ ${solicitacao.valor}`);

      // Verificar se admin consegue ver
      console.log("\n🔍 VERIFICANDO SE ADMIN CONSEGUE VER A SOLICITAÇÃO...");

      const { data: solicitacoes, error: erroVer } = await supabase
        .from("solicitacoes_renovacao")
        .select("*")
        .eq("status", "pendente");

      if (solicitacoes) {
        console.log(`✅ Admin pode ver ${solicitacoes.length} solicitação(ões) pendente(s)`);

        // Tentar buscar com join
        console.log("\n🔗 TESTANDO JOIN COM OPERADORES...");
        const { data: comJoin, error: erroJoin } = await supabase
          .from("solicitacoes_renovacao")
          .select(`
            *,
            operadores (
              id,
              nome,
              email
            )
          `)
          .eq("id", solicitacao.id)
          .single();

        if (comJoin) {
          console.log("✅ JOIN funcionando!");
          console.log(`   Operador: ${comJoin.operadores?.nome || "N/A"}`);
        } else {
          console.log("❌ Erro no JOIN:", erroJoin?.message);
          console.log("\n   🔧 POSSÍVEL CAUSA: Foreign key constraint não configurada corretamente");
        }
      } else {
        console.log("❌ Admin NÃO pode ver solicitações:", erroVer?.message);
      }
    } else {
      console.log("❌ Erro ao criar solicitação:", erroSol?.message);
    }
  }

  console.log("\n✅ CORREÇÃO CONCLUÍDA!");
  console.log("\nPróximos passos:");
  console.log("1. Faça login como Diego (admin)");
  console.log("2. Acesse o painel de Solicitações de Renovação");
  console.log("3. Você deve ver a solicitação pendente de Joelma");
  console.log("4. Aprove a solicitação e verifique se os dias são creditados");
}

corrigirAdmin().catch(console.error);
