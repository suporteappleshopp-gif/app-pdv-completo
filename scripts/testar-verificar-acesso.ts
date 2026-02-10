import { GerenciadorAssinatura } from '../src/lib/assinatura';

async function testar() {
  const userId = '57aa9a8e-d220-467f-8d70-d7ff22bbea47';

  console.log('🧪 Testando verificarAcesso...\n');

  const resultado = await GerenciadorAssinatura.verificarAcesso(userId);

  console.log('\n📊 RESULTADO:');
  console.log('   podeUsar:', resultado.podeUsar);
  console.log('   status:', resultado.status);
  console.log('   diasRestantes:', resultado.diasRestantes);
  console.log('   mensagem:', resultado.mensagem);
  console.log('   mostrarAviso:', resultado.mostrarAviso);

  if (resultado.podeUsar && resultado.diasRestantes > 0) {
    console.log('\n✅ SUCESSO! Usuário pode usar o app por', resultado.diasRestantes, 'dias');
  } else {
    console.log('\n❌ ERRO! Usuário está bloqueado');
  }
}

testar();
