"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { Produto } from "@/lib/types";
import {
  ArrowLeft,
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  Barcode,
  DollarSign,
  TrendingDown,
} from "lucide-react";

export default function EstoquePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // Formulário de produto
  const [produtoForm, setProdutoForm] = useState<Produto>({
    id: "",
    nome: "",
    codigoBarras: "",
    preco: 0,
    estoque: 0,
    estoqueMinimo: 0,
    categoria: "",
  });

  // Estado para o valor formatado do preço (com vírgula)
  const [precoFormatado, setPrecoFormatado] = useState("");

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      setLoading(true);
      await db.init();
      const todosProdutos = await db.getAllProdutos();
      setProdutos(todosProdutos);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
      setErro("Erro ao carregar produtos");
      setTimeout(() => setErro(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNovo = () => {
    setProdutoForm({
      id: "",
      nome: "",
      codigoBarras: "",
      preco: 0,
      estoque: 0,
      estoqueMinimo: 0,
      categoria: "",
    });
    setPrecoFormatado("");
    setModoEdicao(false);
    setShowModal(true);
  };

  const abrirModalEdicao = (produto: Produto) => {
    setProdutoForm(produto);
    setPrecoFormatado(produto.preco.toFixed(2).replace(".", ","));
    setModoEdicao(true);
    setShowModal(true);
  };

  const handlePrecoChange = (valor: string) => {
    // Permite apenas números e vírgula
    const valorLimpo = valor.replace(/[^\d,]/g, "");
    
    // Garante apenas uma vírgula
    const partes = valorLimpo.split(",");
    let valorFormatado = partes[0];
    if (partes.length > 1) {
      valorFormatado += "," + partes[1].slice(0, 2); // Limita a 2 casas decimais
    }
    
    setPrecoFormatado(valorFormatado);
    
    // Converte para número (substitui vírgula por ponto)
    const valorNumerico = parseFloat(valorFormatado.replace(",", ".")) || 0;
    setProdutoForm({
      ...produtoForm,
      preco: valorNumerico,
    });
  };

  const salvarProduto = async () => {
    try {
      // Validações
      if (!produtoForm.nome || !produtoForm.codigoBarras) {
        setErro("Preencha todos os campos obrigatórios");
        setTimeout(() => setErro(""), 3000);
        return;
      }

      if (produtoForm.preco <= 0) {
        setErro("O preço deve ser maior que zero");
        setTimeout(() => setErro(""), 3000);
        return;
      }

      if (modoEdicao) {
        await db.updateProduto(produtoForm);
        setSucesso("Produto atualizado com sucesso!");
      } else {
        const novoProduto = {
          ...produtoForm,
          id: `produto-${Date.now()}`,
        };
        await db.addProduto(novoProduto);
        setSucesso("Produto adicionado com sucesso!");
      }

      setTimeout(() => setSucesso(""), 3000);
      setShowModal(false);
      carregarProdutos();
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
      setErro("Erro ao salvar produto");
      setTimeout(() => setErro(""), 3000);
    }
  };

  const excluirProduto = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      await db.deleteProduto(id);
      setSucesso("Produto excluído com sucesso!");
      setTimeout(() => setSucesso(""), 3000);
      carregarProdutos();
    } catch (err) {
      console.error("Erro ao excluir produto:", err);
      setErro("Erro ao excluir produto");
      setTimeout(() => setErro(""), 3000);
    }
  };

  const produtosFiltrados = produtos.filter((produto) => {
    if (!busca) return true;
    const buscaLower = busca.toLowerCase();
    return (
      produto.nome.toLowerCase().includes(buscaLower) ||
      produto.codigoBarras.includes(busca) ||
      produto.categoria?.toLowerCase().includes(buscaLower)
    );
  });

  const produtosEstoqueBaixo = produtos.filter(
    (p) => p.estoque <= p.estoqueMinimo
  );

  const valorTotalEstoque = produtos.reduce(
    (acc, p) => acc + p.preco * p.estoque,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando estoque...</p>
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
              onClick={() => router.push("/empresa")}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>

            <div className="text-center">
              <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
                <Package className="w-8 h-8" />
                <span>Gestão de Estoque</span>
              </h1>
              <p className="text-purple-200">Controle de produtos e inventário</p>
            </div>

            <button
              onClick={abrirModalNovo}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Novo Produto</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Alertas */}
        {sucesso && (
          <div className="bg-green-500/20 border border-green-500 text-green-100 px-4 py-3 rounded-lg flex items-center backdrop-blur-sm">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">{sucesso}</span>
          </div>
        )}

        {erro && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg flex items-center backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">{erro}</span>
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-4">
              <Package className="w-12 h-12 text-white/80" />
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-bold text-lg">
                  {produtos.length}
                </span>
              </div>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">
              Total de Produtos
            </h3>
            <p className="text-blue-100 text-sm">Produtos cadastrados</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-12 h-12 text-white/80" />
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-bold text-lg">
                  R$ {valorTotalEstoque.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">
              Valor do Estoque
            </h3>
            <p className="text-green-100 text-sm">Valor total em produtos</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-4">
              <TrendingDown className="w-12 h-12 text-white/80" />
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-bold text-lg">
                  {produtosEstoqueBaixo.length}
                </span>
              </div>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Estoque Baixo</h3>
            <p className="text-orange-100 text-sm">Produtos abaixo do mínimo</p>
          </div>
        </div>

        {/* Alerta de Estoque Baixo */}
        {produtosEstoqueBaixo.length > 0 && (
          <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-orange-300 mt-1 flex-shrink-0" />
              <div>
                <p className="text-white font-semibold mb-2">
                  Atenção: {produtosEstoqueBaixo.length} produto(s) com estoque
                  baixo
                </p>
                <div className="space-y-1">
                  {produtosEstoqueBaixo.slice(0, 3).map((produto) => (
                    <p key={produto.id} className="text-orange-200 text-sm">
                      • {produto.nome} - Estoque: {produto.estoque} (Mínimo:{" "}
                      {produto.estoqueMinimo})
                    </p>
                  ))}
                  {produtosEstoqueBaixo.length > 3 && (
                    <p className="text-orange-200 text-sm">
                      ... e mais {produtosEstoqueBaixo.length - 3} produto(s)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Produtos */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Package className="w-7 h-7 mr-3" />
                Produtos em Estoque
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar produtos..."
                  className="pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>
          </div>

          <div className="p-8">
            {produtosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-white/50 mx-auto mb-4" />
                <p className="text-white/70 text-lg">
                  {busca
                    ? "Nenhum produto encontrado"
                    : "Nenhum produto cadastrado"}
                </p>
                {!busca && (
                  <button
                    onClick={abrirModalNovo}
                    className="mt-4 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg font-semibold"
                  >
                    Adicionar Primeiro Produto
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-purple-200 font-semibold py-3 px-4">
                        Produto
                      </th>
                      <th className="text-left text-purple-200 font-semibold py-3 px-4">
                        Código de Barras
                      </th>
                      <th className="text-left text-purple-200 font-semibold py-3 px-4">
                        Categoria
                      </th>
                      <th className="text-right text-purple-200 font-semibold py-3 px-4">
                        Preço
                      </th>
                      <th className="text-center text-purple-200 font-semibold py-3 px-4">
                        Estoque
                      </th>
                      <th className="text-center text-purple-200 font-semibold py-3 px-4">
                        Mínimo
                      </th>
                      <th className="text-center text-purple-200 font-semibold py-3 px-4">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosFiltrados.map((produto) => (
                      <tr
                        key={produto.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <p className="text-white font-semibold">
                            {produto.nome}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <Barcode className="w-4 h-4 text-purple-300" />
                            <span className="text-purple-200 text-sm">
                              {produto.codigoBarras}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-semibold">
                            {produto.categoria || "Sem categoria"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <p className="text-white font-bold">
                            R$ {produto.preco.toFixed(2).replace(".", ",")}
                          </p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              produto.estoque <= produto.estoqueMinimo
                                ? "bg-red-500/20 text-red-300"
                                : "bg-green-500/20 text-green-300"
                            }`}
                          >
                            {produto.estoque}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-purple-200">
                            {produto.estoqueMinimo}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => abrirModalEdicao(produto)}
                              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => excluirProduto(produto.id)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Produto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-2xl sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white">
                {modoEdicao ? "Editar Produto" : "Novo Produto"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-purple-200 text-sm font-semibold mb-2">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    value={produtoForm.nome}
                    onChange={(e) =>
                      setProdutoForm({ ...produtoForm, nome: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: Coca-Cola 2L"
                  />
                </div>

                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-2">
                    Código de Barras *
                  </label>
                  <input
                    type="text"
                    value={produtoForm.codigoBarras}
                    onChange={(e) =>
                      setProdutoForm({
                        ...produtoForm,
                        codigoBarras: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: 7891234567890"
                  />
                </div>

                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-2">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={produtoForm.categoria}
                    onChange={(e) =>
                      setProdutoForm({
                        ...produtoForm,
                        categoria: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: Bebidas"
                  />
                </div>

                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-2">
                    Preço (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300 font-semibold">
                      R$
                    </span>
                    <input
                      type="text"
                      value={precoFormatado}
                      onChange={(e) => handlePrecoChange(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0,00"
                    />
                  </div>
                  <p className="text-purple-300 text-xs mt-1">
                    Use vírgula para centavos (ex: 10,50)
                  </p>
                </div>

                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-2">
                    Quantidade em Estoque
                  </label>
                  <input
                    type="number"
                    value={produtoForm.estoque}
                    onChange={(e) =>
                      setProdutoForm({
                        ...produtoForm,
                        estoque: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-2">
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    value={produtoForm.estoqueMinimo}
                    onChange={(e) =>
                      setProdutoForm({
                        ...produtoForm,
                        estoqueMinimo: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarProduto}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-lg flex items-center justify-center space-x-2"
                >
                  <Save className="w-5 h-5" />
                  <span>{modoEdicao ? "Salvar Alterações" : "Adicionar Produto"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
