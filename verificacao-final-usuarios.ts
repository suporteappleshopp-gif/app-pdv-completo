/**
 * ✅ VERIFICAÇÃO FINAL: Todos os usuários estão corretos?
 */

import { createClient } from "@supabase/supabase-js";
import { differenceInDays } from "date-fns";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verificacaoFinal() {
  console.log("✅ VERIFICAÇÃO FINAL DO SISTEMA\n");
  console.log("=".repeat(70));

  // Buscar todos os usuários
  const { data: usuarios, error } = await supabase
    .from("operadores")
    .select("*")
    .eq("is_admin", false)
    .order("created_at", { ascending: false });

  if (!usuarios || error) {
    console.error("❌ Erro ao buscar usuários:", error);
    return;
  }

  console.log(`\n📊 Total de usuários: ${usuarios.length}\n`);

  let usuariosComAcesso = 0;
  let usuariosBloqueados = 0;

  usuarios.forEach((user: any, idx: number) => {
    const hoje = new Date();
    let diasRestantes = 0;
    let podeAcessar = false;
    let motivo = "";

    console.log(`${idx + 1}. ${user.nome} (${user.email})`);

    // Verificar se pode acessar
    if (user.data_proximo_vencimento) {
      const vencimento = new Date(user.data_proximo_vencimento);
      diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      if (user.ativo && !user.suspenso && diasRestantes > 0) {
        podeAcessar = true;
        motivo = `✅ LIBERADO (${diasRestantes} dias restantes)`;
        usuariosComAcesso++;
      } else if (diasRestantes <= 0) {
        motivo = `❌ BLOQUEADO (vencido há ${Math.abs(diasRestantes)} dias)`;
        usuariosBloqueados++;
      } else if (!user.ativo) {
        motivo = "❌ BLOQUEADO (conta inativa)";
        usuariosBloqueados++;
      } else if (user.suspenso) {
        motivo = "❌ BLOQUEADO (conta suspensa)";
        usuariosBloqueados++;
      }
    } else {
      if (user.aguardando_pagamento) {
        motivo = "❌ BLOQUEADO (aguardando pagamento)";
        usuariosBloqueados++;
      } else if (user.ativo && !user.suspenso) {
        podeAcessar = true;
        motivo = "✅ LIBERADO (sem vencimento)";
        usuariosComAcesso++;
      } else {
        motivo = "❌ BLOQUEADO (sem data de vencimento)";
        usuariosBloqueados++;
      }
    }

    console.log(`   ${motivo}`);
    console.log(`   Ativo: ${user.ativo} | Suspenso: ${user.suspenso} | Aguardando: ${user.aguardando_pagamento}`);

    if (user.data_proximo_vencimento) {
      console.log(`   Vencimento: ${new Date(user.data_proximo_vencimento).toLocaleDateString("pt-BR")}`);
    }

    console.log("");
  });

  console.log("=".repeat(70));
  console.log("\n📊 RESUMO:");
  console.log(`   ✅ Usuários com acesso: ${usuariosComAcesso}`);
  console.log(`   ❌ Usuários bloqueados: ${usuariosBloqueados}`);
  console.log(`   📊 Total: ${usuarios.length}`);

  console.log("\n=".repeat(70));
  console.log("✅ VERIFICAÇÃO CONCLUÍDA!\n");

  // Verificar solicitações pendentes
  const { data: pendentes } = await supabase
    .from("solicitacoes_renovacao")
    .select("*, operadores(nome, email)")
    .eq("status", "pendente");

  if (pendentes && pendentes.length > 0) {
    console.log("\n⚠️  SOLICITAÇÕES PENDENTES DE APROVAÇÃO:");
    pendentes.forEach((sol: any, idx: number) => {
      console.log(`   ${idx + 1}. ${sol.operadores?.nome || "Usuário"}: ${sol.dias_solicitados} dias (R$ ${sol.valor.toFixed(2)})`);
    });
    console.log("\n   👉 Aprove no painel admin para creditar os dias!\n");
  }
}

verificacaoFinal().catch(console.error);
