import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Durante build, aceitar valores vazios (serão verificados em runtime)
// Em runtime, avisar se não estiver configurado
const isBuildTime = typeof window === 'undefined' && !supabaseUrl;

if (!isBuildTime && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('⚠️ Supabase não configurado. Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local');
}

// Criar cliente com valores default se for build time
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Tipos para o banco de dados
export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string;
          nome: string;
          cnpj: string;
          inscricao_estadual: string;
          endereco: string;
          telefone: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['empresas']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['empresas']['Insert']>;
      };
      produtos: {
        Row: {
          id: string;
          nome: string;
          codigo_barras: string;
          preco: number;
          estoque: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['produtos']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['produtos']['Insert']>;
      };
      vendas: {
        Row: {
          id: string;
          numero: number;
          operador_id: string;
          operador_nome: string;
          itens: any;
          total: number;
          data_hora: string;
          status: string;
          tipo_pagamento: string | null;
          motivo_cancelamento: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vendas']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['vendas']['Insert']>;
      };
      operadores: {
        Row: {
          id: string;
          nome: string;
          email: string;
          tipo: string;
          data_proximo_vencimento: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['operadores']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['operadores']['Insert']>;
      };
      config_nfce: {
        Row: {
          id: string;
          empresa_id: string;
          ambiente: string;
          serie_nfce: string;
          proximo_numero: number;
          token_csc: string;
          id_csc: string;
          regime_tributario: string;
          aliquota_icms_padrao: number;
          aliquota_pis_padrao: number;
          aliquota_cofins_padrao: number;
          cfop_padrao: string;
          mensagem_nota: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['config_nfce']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['config_nfce']['Insert']>;
      };
    };
  };
}
