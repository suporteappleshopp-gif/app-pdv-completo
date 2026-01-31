"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { GanhoAdmin } from "@/lib/types";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Calendar,
  DollarSign,
  CreditCard,
  UserPlus,
  Receipt,
  Filter,
  Search,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

type FiltroTipo = "todos" | "conta-criada" | "mensalidade-paga";

export default function CarteiraPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ganhos, setGanhos] = useState<GanhoAdmin[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [buscaUsuario, setBuscaUsuario] = useState("");
  const [mesSelecionado, setMesSelecionado] = useState<Date>(new Date());

  useEffect(() => {
    const checkAuth = () => {
      const adminStatus = localStorage.getItem("isAdmin");
      if (adminStatus !== "true") {
        router.push("/");
        return false;
      }
      return true;
    };

    if (checkAuth()) {
      carregarDados();
    }
  }, [router]);

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Buscar todos os ganhos (retorna array vazio se não houver)
      const todosGanhos = await db.getAllGanhosAdmin();
      console.log("✅ Ganhos carregados:", todosGanhos.length);
      setGanhos(todosGanhos || []);
    } catch (err) {
      console.error("⚠️ Erro ao carregar ganhos:", err);
      // Se der erro, inicializar com array vazio para não travar o app
      setGanhos([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar ganhos
  const ganhosFiltrados = ganhos
    .filter((g) => {
      if (filtroTipo !== "todos" && g.tipo !== filtroTipo) return false;
      if (buscaUsuario && !g.usuarioNome.toLowerCase().includes(buscaUsuario.toLowerCase())) return false;
      
      // Filtro por mês
      const dataGanho = new Date(g.dataHora);
      const inicioMes = startOfMonth(mesSelecionado);
      const fimMes = endOfMonth(mesSelecionado);
      if (!isWithinInterval(dataGanho, { start: inicioMes, end: fimMes })) return false;
      
      return true;
    })
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());

  // Calcular totais separados por forma de pagamento
  const totalGeral = ganhos.reduce((acc, g) => acc + g.valor, 0);
  const totalMesAtual = ganhosFiltrados.reduce((acc, g) => acc + g.valor, 0);
  const totalContasCriadas = ganhos.filter(g => g.tipo === "conta-criada").reduce((acc, g) => acc + g.valor, 0);
  const totalMensalidades = ganhos.filter(g => g.tipo === "mensalidade-paga").reduce((acc, g) => acc + g.valor, 0);
  
  // Separar totais por forma de pagamento
  const totalCartao = ganhos.filter(g => g.formaPagamento === "cartao").reduce((acc, g) => acc + g.valor, 0);
  const totalPix = ganhos.filter(g => g.formaPagamento === "pix").reduce((acc, g) => acc + g.valor, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando carteira...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>

            <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
              <Wallet className="w-8 h-8" />
              <span>Carteira de Ganhos</span>
            </h1>

            <div className="w-24"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Totais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Geral */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-white/80" />
            </div>
            <p className="text-green-100 text-sm mb-1">Total Geral</p>
            <h2 className="text-3xl font-bold text-white">
              R$ {totalGeral.toFixed(2)}
            </h2>
          </div>

          {/* Total Mês Atual */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-white/80" />
            </div>
            <p className="text-blue-100 text-sm mb-1">Mês Selecionado</p>
            <h2 className="text-3xl font-bold text-white">
              R$ {totalMesAtual.toFixed(2)}
            </h2>
          </div>

          {/* Total Contas Criadas */}
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <UserPlus className="w-8 h-8 text-white/80" />
            </div>
            <p className="text-purple-100 text-sm mb-1">Contas Criadas</p>
            <h2 className="text-3xl font-bold text-white">
              R$ {totalContasCriadas.toFixed(2)}
            </h2>
          </div>

          {/* Total Renovações */}
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Receipt className="w-8 h-8 text-white/80" />
            </div>
            <p className="text-orange-100 text-sm mb-1">Compras de Dias</p>
            <h2 className="text-3xl font-bold text-white">
              R$ {totalMensalidades.toFixed(2)}
            </h2>
          </div>
        </div>

        {/* Card Total Cartão de Crédito */}
        <div className="mb-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm mb-2">Total via Cartão de Crédito</p>
                <h3 className="text-3xl font-bold text-white">R$ {totalCartao.toFixed(2)}</h3>
                <p className="text-purple-300 text-xs mt-2">Compra de 180 dias por R$ 149,70</p>
              </div>
              <div className="bg-blue-500/20 p-4 rounded-full">
                <CreditCard className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Card Total PIX */}
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm mb-2">Total via PIX</p>
                <h3 className="text-3xl font-bold text-white">R$ {totalPix.toFixed(2)}</h3>
                <p className="text-purple-300 text-xs mt-2">Compra de 60 dias por R$ 59,90</p>
              </div>
              <div className="bg-green-500/20 p-4 rounded-full">
                <div className="w-8 h-8 flex items-center justify-center">
                  <span className="text-green-400 font-bold text-lg">PIX</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca por usuário */}
            <div className="relative">
              <Search className="w-5 h-5 text-white/60 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={buscaUsuario}
                onChange={(e) => setBuscaUsuario(e.target.value)}
                placeholder="Buscar usuário..."
                className="pl-10 pr-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/60 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all w-full"
              />
            </div>

            {/* Filtro por tipo */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
              className="px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
            >
              <option value="todos">Todos os tipos</option>
              <option value="conta-criada">Contas criadas</option>
              <option value="mensalidade-paga">Compras de dias</option>
            </select>

            {/* Seletor de mês */}
            <input
              type="month"
              value={format(mesSelecionado, "yyyy-MM")}
              onChange={(e) => setMesSelecionado(new Date(e.target.value + "-01"))}
              className="px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Lista de Ganhos */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <TrendingUp className="w-7 h-7 mr-3" />
              Histórico de Ganhos ({ganhosFiltrados.length})
            </h2>
          </div>

          <div className="p-8">
            {ganhosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-16 h-16 text-purple-300 mx-auto mb-4 opacity-50" />
                <p className="text-purple-200 text-lg">Nenhum ganho encontrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ganhosFiltrados.map((ganho) => (
                  <div
                    key={ganho.id}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      {/* Informações do ganho */}
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={`${
                          ganho.tipo === "conta-criada" 
                            ? "bg-gradient-to-r from-purple-500 to-pink-500" 
                            : "bg-gradient-to-r from-orange-500 to-red-500"
                        } w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                          {ganho.tipo === "conta-criada" ? (
                            <UserPlus className="w-6 h-6" />
                          ) : (
                            <Receipt className="w-6 h-6" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-lg mb-1">
                            {ganho.usuarioNome}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm">
                            <p className="text-purple-200">
                              {ganho.descricao}
                            </p>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              ganho.formaPagamento === "pix"
                                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            }`}>
                              {ganho.formaPagamento === "pix" ? "PIX" : "Cartão de Crédito"}
                            </span>
                          </div>
                          <p className="text-purple-300 text-xs mt-1">
                            {format(new Date(ganho.dataHora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>

                      {/* Valor */}
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-400">
                          R$ {ganho.valor.toFixed(2)}
                        </p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                          ganho.tipo === "conta-criada"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                        }`}>
                          {ganho.tipo === "conta-criada" ? "Conta Criada" : "Compra de Dias"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
