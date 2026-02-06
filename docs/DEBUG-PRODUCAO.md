# 🔍 Debug em Produção - Supabase

## Como Verificar se Supabase Está Conectado

### 1. Abra o Console do Navegador (F12)

### 2. Procure por estas mensagens ao carregar a página:

✅ **Se estiver funcionando:**
```
🔧 Supabase URL configurada: SIM
🔧 Supabase Key configurada: SIM
```

❌ **Se NÃO estiver funcionando:**
```
❌ ERRO: Supabase NÃO configurado!
   URL: VAZIA
   Key: VAZIA
```

---

## Como Verificar se a Venda Foi Salva

### 1. Faça uma venda no Caixa

### 2. Veja o console do navegador (F12)

✅ **Se salvou com sucesso:**
```
☁️ Salvando venda no Supabase...
📤 Enviando para Supabase: {...}
✅ Venda salva no Supabase com SUCESSO!
✅ Itens da venda salvos no Supabase!
✅ Estoque do produto [...] atualizado no Supabase!
```

❌ **Se houve erro:**
```
❌ ERRO ao salvar venda no Supabase:
   Mensagem: [mensagem de erro]
   Código: [código do erro]
```

---

## Problemas Comuns

### 1. Variáveis de Ambiente Não Configuradas

**Sintoma:** Console mostra "Supabase NÃO configurado"

**Solução:**
- Verificar se as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão definidas
- Se estiver usando Vercel/Netlify, adicionar as variáveis no painel de configuração
- Rebuildar e redeploy o app

### 2. RLS (Row Level Security) Bloqueando

**Sintoma:** Erro "new row violates row-level security policy"

**Solução:**
- Verificar políticas RLS no Supabase Dashboard
- Garantir que políticas permitem INSERT para usuários autenticados
- SQL para desabilitar temporariamente:
```sql
ALTER TABLE vendas DISABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda DISABLE ROW LEVEL SECURITY;
ALTER TABLE produtos DISABLE ROW LEVEL SECURITY;
```

### 3. Realtime Não Funcionando

**Sintoma:** Vendas não aparecem automaticamente no Histórico/Financeiro

**Solução:**
- O sistema já tem fallback de polling (atualiza a cada 15 segundos)
- Para habilitar realtime, executar SQL:
```sql
ALTER TABLE vendas REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE vendas;

ALTER TABLE itens_venda REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE itens_venda;
```

### 4. Timeout ou Erro de Rede

**Sintoma:** Erro "Failed to fetch" ou timeout

**Solução:**
- Verificar se o projeto Supabase está ativo (não pausado)
- Verificar se há firewall bloqueando conexões ao Supabase
- Verificar se as credenciais estão corretas

---

## Checklist de Produção

Antes de publicar, verificar:

- [ ] Variáveis de ambiente configuradas no servidor de produção
- [ ] RLS configurado corretamente ou desabilitado para testes
- [ ] Realtime habilitado nas tabelas (ou polling funcionando)
- [ ] Projeto Supabase ativo e sem pausa
- [ ] Tabelas criadas com as colunas corretas
- [ ] Console do navegador sem erros críticos

---

## Comandos Úteis

### Verificar Vendas no Banco
```sql
SELECT * FROM vendas ORDER BY created_at DESC LIMIT 10;
```

### Verificar Estoque
```sql
SELECT id, nome, estoque FROM produtos;
```

### Verificar Políticas RLS
```sql
SELECT * FROM pg_policies WHERE tablename IN ('vendas', 'itens_venda', 'produtos');
```

### Verificar Realtime
```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```
