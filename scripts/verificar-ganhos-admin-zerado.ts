import { supabase } from "../src/lib/supabase";

async function verificarGanhosAdmin() {
  console.log("🔍 Verificando carteira de ganhos do admin...\n");

  // Buscar todos os registros
  const { data: ganhos, error, count } = await supabase
    .from("ganhos_admin")
    .select("*", { count: "exact" });

  if (error) {
    console.error("❌ Erro ao buscar ganhos:", error);
    return;
  }

  console.log(`📊 Total de registros na tabela ganhos_admin: ${count || 0}`);

  if (ganhos && ganhos.length > 0) {
    console.log("\n📋 Registros encontrados:");
    ganhos.forEach((ganho, index) => {
      console.log(`   ${index + 1}. R$ ${ganho.valor} - ${ganho.tipo} - ${ganho.usuario_nome || 'N/A'}`);
    });

    // Calcular total
    const total = ganhos.reduce((sum, g) => sum + (g.valor || 0), 0);
    console.log(`\n💰 Total acumulado: R$ ${total.toFixed(2)}`);
  } else {
    console.log("\n✅ Carteira está zerada! Nenhum registro encontrado.");
  }
}

verificarGanhosAdmin()
  .then(() => {
    console.log("\n✅ Verificação concluída!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Erro:", err);
    process.exit(1);
  });
