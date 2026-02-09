# Correções no Sistema de Suspensão de Usuários

## 📋 Resumo das Mudanças

Sistema corrigido para garantir que **usuários NUNCA sejam suspensos antes de vencer todos os dias de uso comprados**.

---

## ✅ Problemas Corrigidos

### 1. **Suspensão Prematura**
- ❌ **ANTES**: Sistema suspendia usuários baseado apenas em `data_proximo_vencimento`
- ✅ **AGORA**: Sistema verifica **dias_restantes** e **total_dias_comprados** antes de suspender

### 2. **Aviso de Vencimento**
- ❌ **ANTES**: Aviso de 5 dias bloqueava o acesso
- ✅ **AGORA**: Com 5 dias do vencimento, usuário é **apenas informado**, mas continua usando o sistema normalmente

### 3. **Suspensão por Inatividade**
- ❌ **ANTES**: Não havia controle de inatividade
- ✅ **AGORA**: Usuários inativos só são suspensos **após o último dia de uso vencer**

---

## 🔧 Arquivos Modificados

### 1. `/workspace/src/lib/assinatura.ts`

#### Função `verificarAcesso()`
Nova lógica de verificação:

```typescript
// PRIORIZAR dias_restantes (banco de dias de uso)
const diasNoSaldo = operador.dias_restantes || operador.total_dias_comprados || 0;

// Se tiver dias no saldo, PERMITIR ACESSO
if (diasNoSaldo > 0) {
  // Com 5 dias do vencimento: APENAS AVISAR (não suspender)
  if (diasAteVencimento <= 5) {
    return {
      podeUsar: true, // ✅ AINDA PODE USAR
      status: "ativo",
      diasRestantes: diasNoSaldo,
      mensagem: "Atenção: Sua assinatura vence em X dias. Você tem Y dias de uso no saldo.",
      mostrarAviso: true,
    };
  }
}

// Se NÃO tiver dias no saldo (diasNoSaldo <= 0), SUSPENDER
if (diasNoSaldo <= 0) {
  // Suspender usuário
  await supabase.from("operadores").update({
    ativo: false,
    suspenso: true,
    aguardando_pagamento: true,
  }).eq("id", operador.id);
}
```

#### Nova Função: `registrarAtividade()`
Registra quando o usuário usa o sistema:

```typescript
static async registrarAtividade(userId: string): Promise<boolean> {
  await supabase.from("operadores").update({
    ultima_atividade: new Date().toISOString(),
  }).eq("id", userId);
}
```

#### Nova Função: `verificarESuspenderInativos()`
Verifica e suspende usuários inativos:

```typescript
static async verificarESuspenderInativos(): Promise<{
  usuariosSuspensos: string[];
  erros: string[];
}> {
  // Regras:
  // 1. Pular admins e usuários sem mensalidade
  // 2. Se tiver dias no saldo (dias_restantes > 0): NÃO suspender
  // 3. Se NÃO tiver dias E passou do vencimento: SUSPENDER
}
```

---

### 2. `/workspace/src/app/admin/page.tsx`

#### Novo Painel: "Próximos Vencimentos (5 dias)"

Exibe usuários que estão próximos ao vencimento (5 dias ou menos):

**Características:**
- Lista ordenada por dias restantes (menor primeiro)
- Mostra dias no saldo de cada usuário
- Indica forma de pagamento (PIX/Cartão)
- **IMPORTANTE**: Aviso visual de que usuários são apenas notificados, não suspensos

**Visual:**
- Balão amarelo no topo com contador
- Lista detalhada com:
  - Nome e email do usuário
  - Dias até vencimento (HOJE, AMANHÃ, ou X dias)
  - Dias no saldo
  - Data de vencimento
  - Forma de pagamento
  - Status do saldo (tem dias / sem dias)

---

### 3. `/workspace/src/lib/types.ts`

#### Campo Adicionado: `ultimaAtividade`

```typescript
export interface Operador {
  // ... campos existentes ...
  ultimaAtividade?: Date; // Última vez que o usuário usou o sistema
}
```

---

### 4. `/workspace/docs/sql/add-ultima-atividade.sql`

SQL para adicionar coluna no Supabase:

```sql
ALTER TABLE operadores
ADD COLUMN IF NOT EXISTS ultima_atividade TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_operadores_ultima_atividade
ON operadores(ultima_atividade);

COMMENT ON COLUMN operadores.ultima_atividade
IS 'Última vez que o usuário usou o sistema (vendas, consultas, etc)';
```

---

## 🎯 Regras de Negócio (REVISADAS)

### 1. **Aviso de Vencimento (5 dias)**
- ✅ Usuário recebe aviso visual
- ✅ Admin vê no painel "Próximos Vencimentos"
- ✅ **Usuário continua usando normalmente**
- ❌ **NÃO é suspenso**

### 2. **Suspensão por Vencimento**
- ✅ Só suspende quando **dias_restantes <= 0** E **passou do vencimento**
- ✅ Enquanto houver dias no saldo, usuário usa normalmente
- ✅ Admin pode ver dias no saldo de cada usuário

### 3. **Usuários Inativos**
- ✅ Rastreamento via campo `ultima_atividade`
- ✅ Só suspende se:
  - Não tem mais dias no saldo (dias_restantes <= 0)
  - Passou da data de vencimento
- ✅ **NUNCA suspende usuário com dias sobrando**, mesmo que inativo

### 4. **Administradores**
- ✅ Admin tem controle total via painel
- ✅ Pode ver próximos vencimentos com 5 dias de antecedência
- ✅ Pode reativar/suspender manualmente quando necessário

---

## 📊 Painel do Admin - Novos Recursos

### Balão "Próximos ao Vencimento"
- Contador de usuários com 5 dias ou menos
- Cor amarela (alerta)
- Ícone de triângulo de alerta

### Lista Detalhada de Próximos Vencimentos
- Ordenação por urgência (menor dias primeiro)
- Informações completas:
  - Nome e email
  - Dias até vencimento
  - Dias no saldo
  - Data de vencimento
  - Forma de pagamento
  - Status visual (cores diferentes para HOJE, AMANHÃ, X dias)
- Badge indicando se tem dias no saldo

---

## 🚀 Próximos Passos

### Para o Administrador:

1. **Executar SQL no Supabase:**
   ```sql
   -- Copiar e executar: /workspace/docs/sql/add-ultima-atividade.sql
   ```

2. **Monitorar Painel:**
   - Acessar painel admin
   - Verificar balão "Próximos ao Vencimento"
   - Analisar usuários próximos do vencimento

3. **Ação Proativa:**
   - Entrar em contato com usuários 5 dias antes do vencimento
   - Oferecer renovação antecipada
   - Verificar se usuários têm dias no saldo

### Para o Sistema:

1. **Registrar Atividade:**
   - Sistema já registra atividade automaticamente em `verificarAcesso()`
   - Pode ser estendido para outras ações (vendas, consultas, etc)

2. **Verificação de Inativos:**
   - Criar job/cron para executar `verificarESuspenderInativos()` diariamente
   - Sugestão: executar às 00:00 de cada dia

---

## ✨ Benefícios

1. **Justiça para Usuários:**
   - Nunca são suspensos antes de consumir todos os dias comprados
   - Recebem avisos com antecedência (5 dias)

2. **Transparência:**
   - Admin vê exatamente quem está próximo do vencimento
   - Informações claras sobre dias no saldo

3. **Controle Administrativo:**
   - Painel visual e intuitivo
   - Possibilidade de ação proativa

4. **Rastreamento de Uso:**
   - Sistema registra última atividade
   - Permite identificar usuários inativos

---

## 🔒 Segurança e Integridade

- ✅ Validação dupla: dias_restantes E data_vencimento
- ✅ Logs detalhados em console
- ✅ Fallback para getAllOperadores() em caso de erro
- ✅ Atualização em tempo real via Supabase

---

## 📝 Notas Importantes

1. **Migration SQL:**
   - Executar SQL `/workspace/docs/sql/add-ultima-atividade.sql` no Supabase
   - Coluna `ultima_atividade` é opcional (já tem DEFAULT NOW())

2. **Compatibilidade:**
   - Sistema continua funcionando mesmo sem a coluna `ultima_atividade`
   - Campos extras são opcionais na interface `Operador`

3. **Performance:**
   - Índice criado em `ultima_atividade` para consultas rápidas
   - Verificação de inativos pode ser executada em background

---

**Data da Correção:** 2026-02-09
**Versão:** 1.0
