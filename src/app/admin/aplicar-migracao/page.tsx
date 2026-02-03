"use client";

import { useState } from "react";
import { CheckCircle, Copy, AlertCircle } from "lucide-react";

export default function AplicarMigracaoPage() {
  const [copiado, setCopiado] = useState(false);

  const sql = `ALTER TABLE solicitacoes_renovacao
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_payment_id
ON solicitacoes_renovacao(mercadopago_payment_id);`;

  const copiarSQL = () => {
    navigator.clipboard.writeText(sql);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-3xl w-full bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
        <div className="flex items-center space-x-3 mb-6">
          <AlertCircle className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl font-bold text-white">Migração Necessária</h1>
        </div>

        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-6 mb-6">
          <p className="text-yellow-200 mb-4">
            Para que o sistema de renovação funcione corretamente, é necessário adicionar uma nova coluna no banco de dados.
          </p>
          <p className="text-yellow-200 text-sm">
            Esta coluna armazenará o ID do pagamento do MercadoPago, permitindo que o admin valide os pagamentos antes de aprovar.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-white font-bold text-lg mb-3 flex items-center space-x-2">
              <span>Passo 1: Copiar SQL</span>
            </h2>
            <div className="relative">
              <pre className="bg-black/50 text-green-300 p-4 rounded-lg overflow-x-auto text-sm border border-white/10">
                {sql}
              </pre>
              <button
                onClick={copiarSQL}
                className="absolute top-3 right-3 flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
              >
                {copiado ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-white font-bold text-lg mb-3 flex items-center space-x-2">
              <span>Passo 2: Executar no Supabase</span>
            </h2>
            <ol className="text-purple-200 space-y-2 text-sm">
              <li>1. Acesse: <a href="https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/editor" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Supabase SQL Editor</a></li>
              <li>2. Cole o SQL copiado acima</li>
              <li>3. Clique em "Run" (ou pressione Ctrl+Enter)</li>
              <li>4. Aguarde a confirmação de sucesso</li>
              <li>5. Volte para a página de administração</li>
            </ol>
          </div>

          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mt-6">
            <p className="text-blue-200 text-sm">
              <strong>Observação:</strong> Após executar a migração, o sistema de renovação estará completo:
            </p>
            <ul className="text-blue-200 text-xs mt-2 space-y-1 ml-4">
              <li>• Usuários poderão solicitar renovação via PIX ou Cartão</li>
              <li>• As solicitações aparecerão como PENDENTES no extrato</li>
              <li>• O admin precisará aprovar manualmente cada solicitação</li>
              <li>• Apenas após aprovação os dias serão creditados</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
