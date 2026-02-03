"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Copy, Database, AlertCircle } from "lucide-react";

export default function SetupTabelaRenovacao() {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);

  const sqlScript = `-- Criar tabela de solicitações de renovação
CREATE TABLE IF NOT EXISTS public.solicitacoes_renovacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID NOT NULL REFERENCES public.operadores(id) ON DELETE CASCADE,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
  dias_solicitados INTEGER NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  mensagem_admin TEXT,
  data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_resposta TIMESTAMP WITH TIME ZONE,
  admin_responsavel_id UUID REFERENCES public.operadores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_operador ON public.solicitacoes_renovacao(operador_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes_renovacao(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_data ON public.solicitacoes_renovacao(data_solicitacao DESC);

-- Habilitar RLS
ALTER TABLE public.solicitacoes_renovacao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios podem ver suas solicitacoes"
  ON public.solicitacoes_renovacao FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.operadores
      WHERE operadores.id = solicitacoes_renovacao.operador_id
      AND operadores.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem ver todas solicitacoes"
  ON public.solicitacoes_renovacao FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.operadores
      WHERE operadores.auth_user_id = auth.uid()
      AND operadores.is_admin = true
    )
  );

CREATE POLICY "Usuarios podem criar solicitacoes"
  ON public.solicitacoes_renovacao FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.operadores
      WHERE operadores.id = operador_id
      AND operadores.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem atualizar solicitacoes"
  ON public.solicitacoes_renovacao FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.operadores
      WHERE operadores.auth_user_id = auth.uid()
      AND operadores.is_admin = true
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_solicitacoes_renovacao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER solicitacoes_renovacao_updated_at
  BEFORE UPDATE ON public.solicitacoes_renovacao
  FOR EACH ROW
  EXECUTE FUNCTION update_solicitacoes_renovacao_updated_at();

COMMENT ON TABLE public.solicitacoes_renovacao IS 'Solicitações de renovação de assinatura dos usuários';`;

  const copiarSQL = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">
              Setup: Tabela de Solicitações de Renovação
            </h1>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">
                  Ação Necessária
                </h3>
                <p className="text-sm text-yellow-800 mb-2">
                  A tabela <code className="bg-yellow-100 px-1 py-0.5 rounded">solicitacoes_renovacao</code> não existe no banco de dados.
                </p>
                <p className="text-sm text-yellow-800">
                  Siga as instruções abaixo para criar a tabela.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Acesse o Supabase Dashboard</h3>
                <p className="text-sm text-gray-600">
                  Faça login no <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Supabase Dashboard</a>
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Vá para o SQL Editor</h3>
                <p className="text-sm text-gray-600">
                  No menu lateral, clique em "SQL Editor"
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-2">Copie e execute o SQL abaixo</h3>

                <div className="relative">
                  <button
                    onClick={copiarSQL}
                    className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-2 z-10"
                  >
                    {copiado ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar SQL</span>
                      </>
                    )}
                  </button>

                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 text-xs font-mono">
                    {sqlScript}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Execute e teste</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Clique em "Run" no SQL Editor e aguarde a confirmação
                </p>
                <p className="text-sm text-gray-600">
                  Após executar, volte para o sistema e teste a funcionalidade de renovação
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <button
              onClick={() => router.push("/extrato-pagamentos")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Ir para Extrato de Pagamentos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
