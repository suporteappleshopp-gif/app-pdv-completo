"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { SupabaseSync } from "@/lib/supabase-sync";
import { Produto } from "@/lib/types";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  ArrowLeft,
  Save,
  X,
  AlertTriangle,
  ArrowUpAZ,
  ArrowDownAZ,
  CheckCircle,
} from "lucide-react";

export default function ProdutosPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [operadorId, setOperadorId] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState("");
  const [produtosFiltrados, setProdutosFiltrados] = useState<Produto[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [ordenacao, setOrdenacao] = useState<"asc" | "desc">("asc");

  // Modal de confirmação de exclusão
  const [mostrarConfirmacaoExcluir, setMostrarConfirmacaoExcluir] = useState(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<{ id: string; nome: string } | null>(null);

  // Formulário
  const [nome, setNome] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [preco, setPreco] = useState("");
  const [estoque, setEstoque] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("");

  useEffect(() => {
    setMounted(true);

    const init = async () => {
      try {
        // Buscar operador logado do Supabase
        const { AuthSupabase } = await import("@/lib/auth-supabase");
        const operador = await AuthSupabase.getCurrentOperador();

        if (!operador) {
          console.error("❌ Operador não encontrado - redirecionando para login");
          router.push("/");
          return;
        }

        setOperadorId(operador.id);
        await carregarProdutos(operador.id);
      } catch (error) {
        console.error("❌ Erro ao inicializar:", error);
        router.push("/");
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!Array.isArray(produtos)) return;
    
    let filtrados = [...produtos];

    // Filtrar por busca
    if (busca.trim()) {
      filtrados = filtrados.filter(
        (p) =>
          p.nome.toLowerCase().includes(busca.toLowerCase()) ||
          p.codigoBarras.includes(busca)
      );
    }

    // Ordenar A-Z ou Z-A
    filtrados.sort((a, b) => {
      if (ordenacao === "asc") {
        return a.nome.localeCompare(b.nome);
      } else {
        return b.nome.localeCompare(a.nome);
      }
    });

    setProdutosFiltrados(filtrados);
  }, [busca, produtos, ordenacao]);

  const carregarProdutos = async (userId?: string) => {
    try {
      const userIdFinal = userId || operadorId;

      if (!userIdFinal) {
        console.error("❌ userId não disponível");
        return;
      }

      await db.init();

      // SEMPRE carregar produtos da nuvem (perfil único garantido)
      console.log("☁️ Carregando produtos da nuvem...");
      const produtosNuvem = await SupabaseSync.loadProdutos(userIdFinal);

      if (produtosNuvem && produtosNuvem.length > 0) {
        // Salvar no IndexedDB como cache local
        for (const produto of produtosNuvem) {
          await db.addProduto(produto);
        }
        setProdutos(produtosNuvem);
        console.log(`✅ ${produtosNuvem.length} produtos carregados da nuvem`);
      } else {
        // Fallback: tentar carregar do IndexedDB local
        console.log("⚠️ Nenhum produto na nuvem, tentando local...");
        const todosProdutos = await db.getAllProdutos();
        setProdutos(Array.isArray(todosProdutos) ? todosProdutos : []);
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setProdutos([]);
    }
  };

  const limparFormulario = () => {
    setNome("");
    setCodigoBarras("");
    setPreco("");
    setEstoque("");
    setEstoqueMinimo("");
    setEditando(null);
  };

  const abrirFormulario = (produto?: Produto) => {
    if (produto) {
      setEditando(produto);
      setNome(produto.nome);
      setCodigoBarras(produto.codigoBarras);
      setPreco(produto.preco.toString());
      setEstoque(produto.estoque.toString());
      setEstoqueMinimo(produto.estoqueMinimo?.toString() || "");
    } else {
      limparFormulario();
    }
    setMostrarFormulario(true);
  };

  const fecharFormulario = () => {
    setMostrarFormulario(false);
    limparFormulario();
  };

  const salvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!operadorId) {
      alert("Erro: Usuário não identificado!");
      return;
    }

    try {
      const produto: Produto = {
        id: editando?.id || `produto-${Date.now()}`,
        nome,
        codigoBarras,
        preco: parseFloat(preco),
        estoque: parseInt(estoque),
        estoqueMinimo: estoqueMinimo ? parseInt(estoqueMinimo) : 0,
      };

      // Salvar no IndexedDB local
      if (editando) {
        await db.updateProduto(produto);
      } else {
        await db.addProduto(produto);
      }

      // Sincronizar com Supabase (perfil único)
      console.log("☁️ Sincronizando produto com Supabase...");
      const todosProdutos = await db.getAllProdutos();
      const sucesso = await SupabaseSync.syncProdutos(operadorId, todosProdutos);

      if (sucesso) {
        alert(editando ? "Produto atualizado com sucesso!" : "Produto cadastrado com sucesso!");
      } else {
        alert("Produto salvo localmente, mas falhou ao sincronizar com a nuvem. Tente novamente.");
      }

      fecharFormulario();
      carregarProdutos();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      alert("Erro ao salvar produto!");
    }
  };

  const abrirConfirmacaoExcluir = (id: string, nome: string) => {
    setProdutoParaExcluir({ id, nome });
    setMostrarConfirmacaoExcluir(true);
  };

  const confirmarExclusao = async () => {
    if (!produtoParaExcluir || !operadorId) return;

    try {
      // Excluir do IndexedDB local
      await db.deleteProduto(produtoParaExcluir.id);

      // Sincronizar com Supabase (perfil único)
      console.log("☁️ Sincronizando exclusão com Supabase...");
      const todosProdutos = await db.getAllProdutos();
      await SupabaseSync.syncProdutos(operadorId, todosProdutos);

      alert("Produto excluído com sucesso!");
      carregarProdutos();
      setMostrarConfirmacaoExcluir(false);
      setProdutoParaExcluir(null);
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      alert("Erro ao excluir produto!");
    }
  };

  const cancelarExclusao = () => {
    setMostrarConfirmacaoExcluir(false);
    setProdutoParaExcluir(null);
  };

  const toggleOrdenacao = () => {
    setOrdenacao(ordenacao === "asc" ? "desc" : "asc");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Calcular total de produtos em estoque (após mounted)
  const totalEstoque = Array.isArray(produtos) ? produtos.reduce((acc, p) => acc + (p.estoque || 0), 0) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-green-600">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/caixa")}
                className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-lg transition-all"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-3 rounded-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Gestão de Estoque</h1>
                <p className="text-sm text-gray-600">Cadastro e controle de produtos</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Topo: Botão Cadastrar + Total em Estoque */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Botão Cadastrar Produto - Canto Superior Esquerdo */}
          <div>
            <button
              onClick={() => abrirFormulario()}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-4 rounded-xl flex items-center justify-center space-x-3 transition-all shadow-lg"
            >
              <Plus className="w-6 h-6" />
              <span className="text-lg font-bold">Cadastrar Produto</span>
            </button>
          </div>

          {/* Total de Produtos em Estoque - Grande */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 mb-1">Total em Estoque</p>
                <p className="text-4xl font-bold">{totalEstoque}</p>
                <p className="text-xs opacity-75 mt-1">{produtos.length} produtos cadastrados</p>
              </div>
              <Package className="w-16 h-16 opacity-30" />
            </div>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Campo de Busca */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou código de barras..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Botão Ordenar A-Z */}
            <button
              onClick={toggleOrdenacao}
              className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-all"
            >
              {ordenacao === "asc" ? (
                <>
                  <ArrowUpAZ className="w-5 h-5" />
                  <span>A-Z</span>
                </>
              ) : (
                <>
                  <ArrowDownAZ className="w-5 h-5" />
                  <span>Z-A</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Lista de Produtos */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
            <h2 className="text-lg font-bold">
              Produtos Cadastrados ({produtosFiltrados.length})
            </h2>
          </div>

          {produtosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Nenhum produto encontrado</p>
              <p className="text-sm">Cadastre seu primeiro produto</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Produto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Código de Barras
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Preço
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      Estoque
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {produtosFiltrados.map((produto) => {
                    const estoqueAbaixoMinimo =
                      produto.estoqueMinimo && produto.estoque <= produto.estoqueMinimo;

                    return (
                      <tr key={produto.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-gray-800">{produto.nome}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                            {produto.codigoBarras}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-bold text-green-600">
                            R$ {produto.preco.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {estoqueAbaixoMinimo && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                            <span
                              className={`font-semibold ${
                                estoqueAbaixoMinimo ? "text-red-600" : "text-gray-800"
                              }`}
                            >
                              {produto.estoque}
                            </span>
                            {produto.estoqueMinimo && (
                              <span className="text-xs text-gray-500">
                                (mín: {produto.estoqueMinimo})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => abrirFormulario(produto)}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-all"
                              title="Editar produto"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => abrirConfirmacaoExcluir(produto.id, produto.nome)}
                              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-all"
                              title="Excluir produto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {mostrarConfirmacaoExcluir && produtoParaExcluir && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <AlertTriangle className="w-6 h-6" />
                <span>Confirmar Exclusão</span>
              </h3>
              <button
                onClick={cancelarExclusao}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-gray-800 font-semibold mb-2">
                  Deseja realmente excluir este produto?
                </p>
                <p className="text-gray-700">
                  <span className="font-bold text-red-600">{produtoParaExcluir.nome}</span>
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Esta ação não pode ser desfeita.
                </p>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={cancelarExclusao}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
                >
                  <X className="w-5 h-5" />
                  <span>Cancelar</span>
                </button>
                <button
                  onClick={confirmarExclusao}
                  className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Formulário */}
      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {editando ? "Editar Produto" : "Novo Produto"}
              </h2>
              <button
                onClick={fecharFormulario}
                className="hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={salvarProduto} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Código de Barras *
                </label>
                <input
                  type="text"
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estoque *
                  </label>
                  <input
                    type="number"
                    value={estoque}
                    onChange={(e) => setEstoque(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    value={estoqueMinimo}
                    onChange={(e) => setEstoqueMinimo(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all"
                >
                  <Save className="w-5 h-5" />
                  <span>{editando ? "Atualizar" : "Cadastrar"}</span>
                </button>
                <button
                  type="button"
                  onClick={fecharFormulario}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all"
                >
                  <X className="w-5 h-5" />
                  <span>Cancelar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
