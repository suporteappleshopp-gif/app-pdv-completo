import { supabase } from './supabase';
import { Produto, Venda, Empresa, ConfiguracaoNFCe, Operador } from './types';
import { db } from './db';

// Sistema de sincronização em nuvem COM SUPORTE MULTI-DISPOSITIVO
export class CloudSync {
  private static syncInProgress = false;
  private static syncQueue: Array<() => Promise<void>> = [];
  private static lastSyncTime: Date | null = null;

  // Verifica se Supabase está configurado
  static isConfigured(): boolean {
    return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  // Sincronizar produtos COM MERGE INTELIGENTE
  static async syncProdutos(produtos: Produto[]): Promise<void> {
    if (!this.isConfigured()) {
      console.log('⚠️ Supabase não configurado - dados salvos localmente');
      return;
    }

    try {
      for (const produto of produtos) {
        // Verificar se produto já existe na nuvem
        const { data: existente } = await supabase
          .from('produtos')
          .select('*')
          .eq('id', produto.id)
          .single();

        if (existente) {
          // Atualizar produto existente
          const { error } = await supabase
            .from('produtos')
            .update({
              nome: produto.nome,
              codigo_barras: produto.codigoBarras,
              preco: produto.preco,
              estoque: produto.estoque,
              updated_at: new Date().toISOString(),
            })
            .eq('id', produto.id);

          if (error) throw error;
        } else {
          // Inserir novo produto
          const { error } = await supabase
            .from('produtos')
            .insert({
              id: produto.id,
              nome: produto.nome,
              codigo_barras: produto.codigoBarras,
              preco: produto.preco,
              estoque: produto.estoque,
              updated_at: new Date().toISOString(),
            });

          if (error) throw error;
        }
      }
      console.log('✅ Produtos sincronizados na nuvem');
    } catch (error) {
      console.error('❌ Erro ao sincronizar produtos:', error);
      throw error;
    }
  }

  // Sincronizar vendas COM MERGE INTELIGENTE
  static async syncVendas(vendas: Venda[]): Promise<void> {
    if (!this.isConfigured()) {
      console.log('⚠️ Supabase não configurado - dados salvos localmente');
      return;
    }

    try {
      for (const venda of vendas) {
        // Verificar se venda já existe na nuvem
        const { data: existente } = await supabase
          .from('vendas')
          .select('*')
          .eq('id', venda.id)
          .single();

        const vendaData = {
          id: venda.id,
          total: venda.total,
          forma_pagamento: venda.tipoPagamento || 'dinheiro',
          itens: venda.itens,
          updated_at: new Date().toISOString(),
        };

        if (existente) {
          // Atualizar venda existente
          const { error } = await supabase
            .from('vendas')
            .update(vendaData)
            .eq('id', venda.id);

          if (error) throw error;
        } else {
          // Inserir nova venda
          const { error } = await supabase
            .from('vendas')
            .insert(vendaData);

          if (error) throw error;
        }
      }
      console.log('✅ Vendas sincronizadas na nuvem');
    } catch (error) {
      console.error('❌ Erro ao sincronizar vendas:', error);
      throw error;
    }
  }

  // Sincronizar empresa
  static async syncEmpresa(empresa: Empresa): Promise<void> {
    if (!this.isConfigured()) {
      console.log('⚠️ Supabase não configurado - dados salvos localmente');
      return;
    }

    try {
      const { error } = await supabase
        .from('empresas')
        .upsert({
          id: empresa.id,
          nome: empresa.nome,
          cnpj: empresa.cnpj,
          inscricao_estadual: empresa.inscricaoEstadual,
          endereco: empresa.endereco,
          telefone: empresa.telefone,
          email: empresa.email,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      console.log('✅ Empresa sincronizada na nuvem');
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message || '';
        if (!errorMessage.includes('relation') && !errorMessage.includes('does not exist')) {
          console.warn('⚠️ Erro ao sincronizar empresa (dados salvos localmente)');
        }
      }
    }
  }

  // Sincronizar configuração NFC-e
  static async syncConfigNFCe(config: ConfiguracaoNFCe): Promise<void> {
    if (!this.isConfigured()) {
      console.log('⚠️ Supabase não configurado - dados salvos localmente');
      return;
    }

    try {
      const { error } = await supabase
        .from('config_nfce')
        .upsert({
          id: config.id,
          empresa_id: config.empresaId,
          ambiente: config.ambiente,
          serie_nfce: config.serieNFCe,
          proximo_numero: config.proximoNumero,
          token_csc: config.tokenCSC,
          id_csc: config.idCSC,
          regime_tributario: config.regimeTributario,
          aliquota_icms_padrao: config.aliquotaICMSPadrao,
          aliquota_pis_padrao: config.aliquotaPISPadrao,
          aliquota_cofins_padrao: config.aliquotaCOFINSPadrao,
          cfop_padrao: config.cfopPadrao,
          mensagem_nota: config.mensagemNota,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      console.log('✅ Configuração NFC-e sincronizada na nuvem');
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message || '';
        if (!errorMessage.includes('relation') && !errorMessage.includes('does not exist')) {
          console.warn('⚠️ Erro ao sincronizar configuração NFC-e (dados salvos localmente)');
        }
      }
    }
  }

  // Carregar produtos da nuvem E MESCLAR COM DADOS LOCAIS
  static async loadProdutos(): Promise<Produto[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');

      if (error) throw error;

      const produtosNuvem = (data || []).map(p => ({
        id: p.id,
        nome: p.nome,
        codigoBarras: p.codigo_barras,
        preco: parseFloat(p.preco),
        estoque: p.estoque,
      }));

      // Salvar no IndexedDB local para acesso offline
      await db.init();
      for (const produto of produtosNuvem) {
        const produtoLocal = await db.getProduto(produto.id);
        if (!produtoLocal) {
          await db.addProduto(produto);
        } else {
          await db.updateProduto(produto);
        }
      }

      return produtosNuvem;
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error);
      return [];
    }
  }

  // Carregar vendas da nuvem E MESCLAR COM DADOS LOCAIS
  static async loadVendas(): Promise<Venda[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const vendasNuvem = (data || []).map(v => ({
        id: v.id,
        numero: 0, // Será atualizado pelo sistema local
        operadorId: '',
        operadorNome: '',
        itens: v.itens,
        total: parseFloat(v.total),
        dataHora: new Date(v.created_at),
        status: 'concluida' as const,
        tipoPagamento: v.forma_pagamento as any,
      }));

      // Salvar no IndexedDB local para acesso offline
      await db.init();
      for (const venda of vendasNuvem) {
        const vendaLocal = await db.getVenda(venda.id);
        if (!vendaLocal) {
          await db.addVenda(venda);
        }
      }

      return vendasNuvem;
    } catch (error) {
      console.error('❌ Erro ao carregar vendas:', error);
      return [];
    }
  }

  // Carregar empresa da nuvem
  static async loadEmpresa(): Promise<Empresa | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .limit(1);

      if (!data || data.length === 0) {
        return null;
      }

      if (error) {
        console.error('❌ Erro ao carregar empresa:', error);
        return null;
      }

      const empresa = data[0];
      return {
        id: empresa.id,
        nome: empresa.nome,
        cnpj: empresa.cnpj,
        inscricaoEstadual: empresa.inscricao_estadual,
        endereco: empresa.endereco,
        telefone: empresa.telefone,
        email: empresa.email,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        console.error('❌ Erro ao carregar empresa:', error);
      }
      return null;
    }
  }

  // Carregar configuração NFC-e da nuvem
  static async loadConfigNFCe(): Promise<ConfiguracaoNFCe | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('config_nfce')
        .select('*')
        .limit(1);

      if (!data || data.length === 0) {
        return null;
      }

      if (error) {
        console.error('❌ Erro ao carregar configuração NFC-e:', error);
        return null;
      }

      const config = data[0];
      return {
        id: config.id,
        empresaId: config.empresa_id,
        ambiente: config.ambiente as 'producao' | 'homologacao',
        serieNFCe: config.serie_nfce,
        proximoNumero: config.proximo_numero,
        tokenCSC: config.token_csc,
        idCSC: config.id_csc,
        regimeTributario: config.regime_tributario as 'simples' | 'normal' | 'mei',
        aliquotaICMSPadrao: parseFloat(config.aliquota_icms_padrao),
        aliquotaPISPadrao: parseFloat(config.aliquota_pis_padrao),
        aliquotaCOFINSPadrao: parseFloat(config.aliquota_cofins_padrao),
        cfopPadrao: config.cfop_padrao,
        mensagemNota: config.mensagem_nota,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        console.error('❌ Erro ao carregar configuração NFC-e:', error);
      }
      return null;
    }
  }

  // Sincronização completa BIDIRECIONAL (nuvem <-> local)
  static async syncAll(): Promise<void> {
    if (!this.isConfigured()) {
      console.log('⚠️ Supabase não configurado - operando em modo local');
      return;
    }

    if (this.syncInProgress) {
      console.log('⏳ Sincronização já em andamento...');
      return;
    }

    try {
      this.syncInProgress = true;
      console.log('🔄 Iniciando sincronização bidirecional...');

      await db.init();

      // 1. CARREGAR DA NUVEM (prioridade)
      console.log('📥 Carregando dados da nuvem...');
      const produtosNuvem = await this.loadProdutos();
      const vendasNuvem = await this.loadVendas();

      // 2. CARREGAR DADOS LOCAIS
      console.log('💾 Carregando dados locais...');
      const produtosLocal = await db.getAllProdutos();
      const vendasLocal = await db.getAllVendas();

      // 3. SINCRONIZAR PRODUTOS LOCAIS PARA NUVEM (que não estão na nuvem)
      const produtosParaSincronizar = produtosLocal.filter(
        pl => !produtosNuvem.find(pn => pn.id === pl.id)
      );
      if (produtosParaSincronizar.length > 0) {
        console.log(`📤 Enviando ${produtosParaSincronizar.length} produtos locais para nuvem...`);
        await this.syncProdutos(produtosParaSincronizar);
      }

      // 4. SINCRONIZAR VENDAS LOCAIS PARA NUVEM (que não estão na nuvem)
      const vendasParaSincronizar = vendasLocal.filter(
        vl => !vendasNuvem.find(vn => vn.id === vl.id)
      );
      if (vendasParaSincronizar.length > 0) {
        console.log(`📤 Enviando ${vendasParaSincronizar.length} vendas locais para nuvem...`);
        await this.syncVendas(vendasParaSincronizar);
      }

      this.lastSyncTime = new Date();
      console.log('✅ Sincronização bidirecional completa!');
      console.log(`📊 Produtos: ${produtosNuvem.length} na nuvem, ${produtosLocal.length} locais`);
      console.log(`📊 Vendas: ${vendasNuvem.length} na nuvem, ${vendasLocal.length} locais`);
    } catch (error) {
      console.error('❌ Erro na sincronização completa:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Configurar sincronização automática BIDIRECIONAL
  static setupAutoSync(intervalMs: number = 30000): void {
    if (!this.isConfigured()) {
      console.log('⚠️ Supabase não configurado - sincronização automática desabilitada');
      return;
    }

    // Sincronizar imediatamente ao iniciar
    this.syncAll();

    // Sincronizar a cada intervalo
    setInterval(() => {
      this.syncAll();
    }, intervalMs);

    // Sincronizar quando voltar online
    window.addEventListener('online', () => {
      console.log('🌐 Conexão restaurada - sincronizando...');
      this.syncAll();
    });

    // Sincronizar antes de fechar a página
    window.addEventListener('beforeunload', () => {
      if (!this.syncInProgress) {
        this.syncAll();
      }
    });

    console.log(`✅ Sincronização automática BIDIRECIONAL configurada (a cada ${intervalMs / 1000}s)`);
  }

  // Obter status da última sincronização
  static getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  // Forçar sincronização manual
  static async forceSyncNow(): Promise<void> {
    console.log('🔄 Sincronização manual forçada...');
    await this.syncAll();
  }
}
