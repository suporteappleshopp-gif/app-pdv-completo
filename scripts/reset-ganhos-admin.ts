import { supabase } from "../src/lib/supabase";

async function resetGanhosAdmin() {
  console.log("🔄 Zerando carteira de ganhos do admin...");

  // Buscar total de registros antes de deletar
  const { count: totalAntes } = await supabase
    .from("ganhos_admin")
    .select("*", { count: "exact", head: true });

  console.log(`📊 Total de registros atuais: ${totalAntes || 0}`);

  // Deletar todos os registros
  const { error } = await supabase
    .from("ganhos_admin")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Condição sempre verdadeira

  if (error) {
    console.error("❌ Erro ao zerar ganhos:", error);
    process.exit(1);
  }

  // Verificar se foi zerado
  const { count: totalDepois } = await supabase
    .from("ganhos_admin")
    .select("*", { count: "exact", head: true });

  console.log(`✅ Carteira de ganhos do admin zerada com sucesso!`);
  console.log(`   Registros removidos: ${totalAntes || 0}`);
  console.log(`   Registros restantes: ${totalDepois || 0}`);
}

resetGanhosAdmin()
  .then(() => {
    console.log("\n✅ Operação concluída!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Erro:", err);
    process.exit(1);
  });
