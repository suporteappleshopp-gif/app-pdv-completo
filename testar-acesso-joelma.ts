/**
 * 🧪 TESTAR: Acesso da Joelma ao app
 */

import { GerenciadorAssinatura } from "./src/lib/assinatura";

async function testarAcessoJoelma() {
  console.log("🧪 TESTANDO ACESSO DA JOELMA\n");
  console.log("=".repeat(70));

  const joelmaId = "user-1770008567175-qgfr9e3ql";

  console.log("\n🔍 Verificando acesso da Joelma...");
  console.log(`   ID: ${joelmaId}\n`);

  const resultado = await GerenciadorAssinatura.verificarAcesso(joelmaId);

  console.log("📊 RESULTADO:");
  console.log(`   ✅ Pode usar o app? ${resultado.podeUsar ? "SIM" : "NÃO"}`);
  console.log(`   📊 Status: ${resultado.status}`);
  console.log(`   📅 Dias restantes: ${resultado.diasRestantes}`);
  console.log(`   💬 Mensagem: ${resultado.mensagem}`);
  console.log(`   ⚠️  Mostrar aviso: ${resultado.mostrarAviso ? "SIM" : "NÃO"}`);

  console.log("\n" + "=".repeat(70));

  if (resultado.podeUsar) {
    console.log("\n✅ SUCESSO! Joelma pode acessar o app normalmente!");
  } else {
    console.log("\n❌ PROBLEMA! Joelma está bloqueada!");
    console.log("   Verifique o status da conta no painel admin.");
  }
}

testarAcessoJoelma().catch(console.error);
