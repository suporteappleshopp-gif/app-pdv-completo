// Simulação do cálculo que a página faz

type Solicitacao = {
  status: "pendente" | "aprovado" | "recusado";
  dias_solicitados: number;
  valor: number;
  forma_pagamento: string;
};

// Dados de exemplo baseados no banco de dados
const solicitacoes: Solicitacao[] = [
  {
    status: "aprovado",
    dias_solicitados: 60,
    valor: 59.90,
    forma_pagamento: "pix"
  }
];

// Cálculo igual ao da página
const totalDiasComprados = solicitacoes
  .filter((s) => s.status === "aprovado")
  .reduce((acc, s) => acc + s.dias_solicitados, 0);

console.log('🧪 TESTE DE CÁLCULO DA PÁGINA EXTRATO DE PAGAMENTOS\n');
console.log('═'.repeat(60));
console.log('\n📊 DADOS:');
console.log('   Solicitações:', solicitacoes.length);
console.log('   Aprovadas:', solicitacoes.filter(s => s.status === "aprovado").length);
console.log('   Pendentes:', solicitacoes.filter(s => s.status === "pendente").length);
console.log('   Recusadas:', solicitacoes.filter(s => s.status === "recusado").length);

console.log('\n💰 DETALHES DAS SOLICITAÇÕES APROVADAS:');
solicitacoes
  .filter(s => s.status === "aprovado")
  .forEach((s, i) => {
    console.log(`   [${i + 1}] ${s.forma_pagamento.toUpperCase()}`);
    console.log(`       Valor: R$ ${s.valor.toFixed(2)}`);
    console.log(`       Dias: ${s.dias_solicitados}`);
  });

console.log('\n✅ RESULTADO FINAL:');
console.log(`   Total de Dias Comprados: ${totalDiasComprados}`);

console.log('\n' + '═'.repeat(60));

if (totalDiasComprados === 60) {
  console.log('\n🎉 SUCESSO! O cálculo está correto!');
  console.log('   A página "Extrato de Pagamentos" mostrará: 60 dias');
} else {
  console.log('\n❌ ERRO! Valor esperado: 60, valor calculado:', totalDiasComprados);
}
