import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Verificar se as credenciais são válidas
const hasValidCredentials =
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseAnonKey !== 'your_supabase_anon_key_here' &&
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'));

// Avisar se não estiver configurado
if (!hasValidCredentials && typeof window !== 'undefined') {
  console.warn('⚠️ Supabase não configurado. Selecione um projeto Supabase no ícone do chat.');
}

// Criar cliente somente se tiver credenciais válidas
export const supabase: SupabaseClient = hasValidCredentials
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder');

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
          total: number;
          forma_pagamento: string | null;
          status: string;
          motivo_cancelamento: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vendas']['Row'], 'created_at'>;
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
