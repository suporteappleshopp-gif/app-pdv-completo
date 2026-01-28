"use client";

import { Empresa, Produto, Venda, Operador, CodigoRecuperacao, Pagamento, GanhoAdmin } from "./types";

const DB_NAME = "pdv_database";
const DB_VERSION = 4; // Incrementado para adicionar store de ganhos

class PDVDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    // Se já existe uma inicialização em andamento, retorna ela
    if (this.initPromise) {
      return this.initPromise;
    }

    // Se já está inicializado, retorna imediatamente
    if (this.db) {
      return Promise.resolve();
    }

    // Cria nova promise de inicialização
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("Erro ao abrir banco de dados:", request.error);
        this.initPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("Banco de dados inicializado com sucesso");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log("Atualizando estrutura do banco de dados...");

        // Store de Empresas
        if (!db.objectStoreNames.contains("empresas")) {
          db.createObjectStore("empresas", { keyPath: "id" });
          console.log("Store 'empresas' criada");
        }

        // Store de Produtos
        if (!db.objectStoreNames.contains("produtos")) {
          const produtoStore = db.createObjectStore("produtos", { keyPath: "id" });
          produtoStore.createIndex("codigoBarras", "codigoBarras", { unique: false });
          produtoStore.createIndex("nome", "nome", { unique: false });
          console.log("Store 'produtos' criada");
        }

        // Store de Vendas
        if (!db.objectStoreNames.contains("vendas")) {
          const vendaStore = db.createObjectStore("vendas", { keyPath: "id" });
          vendaStore.createIndex("numero", "numero", { unique: true });
          vendaStore.createIndex("operadorId", "operadorId", { unique: false });
          vendaStore.createIndex("dataHora", "dataHora", { unique: false });
          console.log("Store 'vendas' criada");
        }

        // Store de Operadores
        if (!db.objectStoreNames.contains("operadores")) {
          const operadorStore = db.createObjectStore("operadores", { keyPath: "id" });
          operadorStore.createIndex("email", "email", { unique: true });
          console.log("Store 'operadores' criada");
        }

        // Store de Códigos de Recuperação
        if (!db.objectStoreNames.contains("codigosRecuperacao")) {
          const codigoStore = db.createObjectStore("codigosRecuperacao", { keyPath: "email" });
          codigoStore.createIndex("codigo", "codigo", { unique: false });
          console.log("Store 'codigosRecuperacao' criada");
        }

        // Store de Pagamentos
        if (!db.objectStoreNames.contains("pagamentos")) {
          const pagamentoStore = db.createObjectStore("pagamentos", { keyPath: "id" });
          pagamentoStore.createIndex("usuarioId", "usuarioId", { unique: false });
          pagamentoStore.createIndex("status", "status", { unique: false });
          console.log("Store 'pagamentos' criada");
        }

        // Store de Configurações
        if (!db.objectStoreNames.contains("configuracoes")) {
          db.createObjectStore("configuracoes", { keyPath: "chave" });
          console.log("Store 'configuracoes' criada");
        }

        // NOVO: Store de Ganhos do Admin
        if (!db.objectStoreNames.contains("ganhosAdmin")) {
          const ganhoStore = db.createObjectStore("ganhosAdmin", { keyPath: "id" });
          ganhoStore.createIndex("usuarioId", "usuarioId", { unique: false });
          ganhoStore.createIndex("tipo", "tipo", { unique: false });
          ganhoStore.createIndex("dataHora", "dataHora", { unique: false });
          console.log("Store 'ganhosAdmin' criada");
        }
      };
    });

    return this.initPromise;
  }

  private async ensureInit(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  // Operadores
  async addOperador(operador: Operador): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("operadores", "readwrite");
      const request = tx.objectStore("operadores").add(operador);
      request.onsuccess = () => {
        console.log("Operador adicionado:", operador.id);
        resolve();
      };
      request.onerror = () => {
        console.error("Erro ao adicionar operador:", request.error);
        reject(request.error);
      };
    });
  }

  async updateOperador(operador: Operador): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("operadores", "readwrite");
      const request = tx.objectStore("operadores").put(operador);
      request.onsuccess = () => {
        console.log("Operador atualizado:", operador.id);
        resolve();
      };
      request.onerror = () => {
        console.error("Erro ao atualizar operador:", request.error);
        reject(request.error);
      };
    });
  }

  async getOperadorByEmail(email: string): Promise<Operador | undefined> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("operadores", "readonly");
      const index = tx.objectStore("operadores").index("email");
      const request = index.get(email);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getOperador(id: string): Promise<Operador | undefined> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("operadores", "readonly");
      const request = tx.objectStore("operadores").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllOperadores(): Promise<Operador[]> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("operadores", "readonly");
      const request = tx.objectStore("operadores").getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOperador(id: string): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("operadores", "readwrite");
      const request = tx.objectStore("operadores").delete(id);
      request.onsuccess = () => {
        console.log("Operador excluído:", id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Pagamentos
  async addPagamento(pagamento: Pagamento): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("pagamentos", "readwrite");
      const request = tx.objectStore("pagamentos").add(pagamento);
      request.onsuccess = () => {
        console.log("Pagamento adicionado:", pagamento.id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updatePagamento(pagamento: Pagamento): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("pagamentos", "readwrite");
      const request = tx.objectStore("pagamentos").put(pagamento);
      request.onsuccess = () => {
        console.log("Pagamento atualizado:", pagamento.id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPagamentosByUsuario(usuarioId: string): Promise<Pagamento[]> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("pagamentos", "readonly");
      const index = tx.objectStore("pagamentos").index("usuarioId");
      const request = index.getAll(usuarioId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPagamentos(): Promise<Pagamento[]> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("pagamentos", "readonly");
      const request = tx.objectStore("pagamentos").getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // NOVO: Ganhos do Admin
  async addGanhoAdmin(ganho: GanhoAdmin): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("ganhosAdmin", "readwrite");
      const request = tx.objectStore("ganhosAdmin").add(ganho);
      request.onsuccess = () => {
        console.log("Ganho registrado:", ganho.id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllGanhosAdmin(): Promise<GanhoAdmin[]> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("ganhosAdmin", "readonly");
      const request = tx.objectStore("ganhosAdmin").getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getGanhosByUsuario(usuarioId: string): Promise<GanhoAdmin[]> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("ganhosAdmin", "readonly");
      const index = tx.objectStore("ganhosAdmin").index("usuarioId");
      const request = index.getAll(usuarioId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Códigos de Recuperação
  async saveCodigoRecuperacao(codigoRecuperacao: CodigoRecuperacao): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("codigosRecuperacao", "readwrite");
      const request = tx.objectStore("codigosRecuperacao").put(codigoRecuperacao);
      request.onsuccess = () => {
        console.log("Código de recuperação salvo para:", codigoRecuperacao.email);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getCodigoRecuperacao(email: string): Promise<CodigoRecuperacao | undefined> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("codigosRecuperacao", "readonly");
      const request = tx.objectStore("codigosRecuperacao").get(email);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCodigoRecuperacao(email: string): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("codigosRecuperacao", "readwrite");
      const request = tx.objectStore("codigosRecuperacao").delete(email);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Empresa
  async saveEmpresa(empresa: Empresa): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("empresas", "readwrite");
      const request = tx.objectStore("empresas").put(empresa);
      request.onsuccess = () => {
        console.log("Empresa salva:", empresa.id);
        resolve();
      };
      request.onerror = () => {
        console.error("Erro ao salvar empresa:", request.error);
        reject(request.error);
      };
    });
  }

  async getEmpresa(): Promise<Empresa | undefined> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("empresas", "readonly");
      const request = tx.objectStore("empresas").getAll();
      request.onsuccess = () => {
        const empresas = request.result || [];
        resolve(empresas[0]);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Produtos
  async addProduto(produto: Produto): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("produtos", "readwrite");
      const request = tx.objectStore("produtos").add(produto);
      request.onsuccess = () => {
        console.log("Produto adicionado:", produto.id, produto.nome);
        resolve();
      };
      request.onerror = () => {
        console.error("Erro ao adicionar produto:", request.error);
        reject(request.error);
      };
    });
  }

  async updateProduto(produto: Produto): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("produtos", "readwrite");
      const request = tx.objectStore("produtos").put(produto);
      request.onsuccess = () => {
        console.log("Produto atualizado:", produto.id, produto.nome);
        resolve();
      };
      request.onerror = () => {
        console.error("Erro ao atualizar produto:", request.error);
        reject(request.error);
      };
    });
  }

  async getProduto(id: string): Promise<Produto | undefined> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("produtos", "readonly");
      const request = tx.objectStore("produtos").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getProdutoByCodigoBarras(codigo: string): Promise<Produto | undefined> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("produtos", "readonly");
      const index = tx.objectStore("produtos").index("codigoBarras");
      const request = index.get(codigo);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async searchProdutos(termo: string): Promise<Produto[]> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("produtos", "readonly");
      const request = tx.objectStore("produtos").getAll();
      request.onsuccess = () => {
        const produtos = request.result || [];
        const termoLower = termo.toLowerCase();
        const filtered = produtos.filter(
          (p) =>
            p.nome.toLowerCase().includes(termoLower) ||
            p.codigoBarras.includes(termo)
        );
        resolve(filtered);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllProdutos(): Promise<Produto[]> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("produtos", "readonly");
      const request = tx.objectStore("produtos").getAll();
      request.onsuccess = () => {
        const produtos = request.result || [];
        console.log("Produtos carregados:", produtos.length);
        resolve(produtos);
      };
      request.onerror = () => {
        console.error("Erro ao carregar produtos:", request.error);
        reject(request.error);
      };
    });
  }

  async deleteProduto(id: string): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("produtos", "readwrite");
      const request = tx.objectStore("produtos").delete(id);
      request.onsuccess = () => {
        console.log("Produto excluído:", id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Vendas
  async addVenda(venda: Venda): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("vendas", "readwrite");
      const request = tx.objectStore("vendas").add(venda);
      request.onsuccess = () => {
        console.log("Venda adicionada:", venda.id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateVenda(venda: Venda): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("vendas", "readwrite");
      const request = tx.objectStore("vendas").put(venda);
      request.onsuccess = () => {
        console.log("Venda atualizada:", venda.id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getVenda(id: string): Promise<Venda | undefined> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("vendas", "readonly");
      const request = tx.objectStore("vendas").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllVendas(): Promise<Venda[]> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("vendas", "readonly");
      const request = tx.objectStore("vendas").getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getVendasByOperador(operadorId: string): Promise<Venda[]> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("vendas", "readonly");
      const index = tx.objectStore("vendas").index("operadorId");
      const request = index.getAll(operadorId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getProximoNumeroVenda(): Promise<number> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("vendas", "readonly");
      const request = tx.objectStore("vendas").getAll();
      request.onsuccess = () => {
        const vendas = request.result || [];
        if (vendas.length === 0) {
          resolve(1);
        } else {
          const maxNumero = Math.max(...vendas.map((v) => v.numero));
          resolve(maxNumero + 1);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Configurações
  async setConfig(chave: string, valor: any): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("configuracoes", "readwrite");
      const request = tx.objectStore("configuracoes").put({ chave, valor });
      request.onsuccess = () => {
        console.log("Configuração salva:", chave);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getConfig(chave: string): Promise<any> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("configuracoes", "readonly");
      const request = tx.objectStore("configuracoes").get(chave);
      request.onsuccess = () => resolve(request.result?.valor);
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new PDVDatabase();
