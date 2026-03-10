# Memory - PDV System

## Projeto
PDV (Ponto de Venda) com Next.js + Supabase. Sistema de caixa, estoque, financeiro, histórico de vendas, gestão de operadores.

## Stack
- Next.js (App Router), TypeScript, Tailwind CSS, Supabase, shadcn/ui, lucide-react

## Banco de Dados (Supabase)
- **vendas**: id, numero, operador_id, operador_nome, itens (JSONB legado), total, data_hora, status, forma_pagamento, motivo_cancelamento, created_at, updated_at, exclusoes, devolucoes, valor_recebido, troco, tipo_pagamento
- **itens_venda**: id, venda_id, produto_id, nome, codigo_barras (adicionado), quantidade, preco_unitario, subtotal, created_at
- **trocas_extornos**: tabela criada para registro fiscal de trocas/extornos (CFOP 5411, SEFAZ) — campos: venda_id, operador_id/nome, tipo (troca/extorno), numero, itens_originais, itens_novos, valor_original, valor_diferenca, forma_pagamento_diferenca, motivo, nota_referenciada, cfop_devolucao, motivo_fiscal, status
- **operadores**: id, nome, email, tipo, senha, isAdmin, etc
- **avarias**: registro de produtos com defeito/devolvidos
- **empresas**: dados fiscais da empresa
- **config_nfce**: configurações NFC-e
- Realtime ativado para: vendas, itens_venda, trocas_extornos

## Correções feitas (última sessão)
1. **Bug admin/lojas**: coluna `codigo_barras` faltava em itens_venda — adicionada via migração
2. **Estatísticas admin**: usavam estado de closure desatualizado — corrigido com useRef + useCallback
3. **Histórico**: substituídos botões "Apagar Venda/Item" por "Troca" e "Extorno" com modal fiscal completo
4. **Modal Troca/Extorno**: inclui motivo SEFAZ obrigatório, CFOP 5411, nota referenciada, forma de devolução, histórico de operações
5. **Colunas adicionadas**: devolucoes, valor_recebido, troco, tipo_pagamento na tabela vendas

## Rotas principais
- /caixa — PDV
- /historico — Histórico de vendas (com troca/extorno)
- /empresa — Config empresa + NFC-e
- /estoque — Gestão de produtos
- /financeiro — Financeiro
- /admin — Painel admin
- /admin/lojas — Análise de lojas (corrigida)

## Auth
- Dual auth: Supabase Auth + banco direto (fallback)
- Admin master session via localStorage("admin_master_session")
