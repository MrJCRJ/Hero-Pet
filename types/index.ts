/**
 * Tipos compartilhados do Hero-Pet.
 * Fonte única para Entity, Product, Order, Despesa e filtros.
 */

// Re-exporta tipos derivados dos schemas Zod
export type { EntityInput } from "@/lib/schemas/entity";
export type { ProductInput } from "@/lib/schemas/product";
export type {
  DespesaInput,
  DespesaUpdateInput,
} from "@/lib/schemas/despesa";

// Entidades (resposta da API)
export interface Entity {
  id: number;
  name: string;
  entity_type: "PF" | "PJ" | string;
  tipo_cliente?: "pessoa_fisica" | "pessoa_juridica" | string | null;
  document_digits: string | null;
  document_status: string;
  document_pending: boolean;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  numero: string | null;
  complemento: string | null;
  observacao?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  address_fill?: string;
  contact_fill?: string;
}

export interface EntityFilters {
  status?: string;
  entity_type?: string;
  q?: string;
  address_fill?: string;
  contact_fill?: string;
  limit?: number;
  offset?: number;
}

// Produtos
export interface Product {
  id: number;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  fabricante?: string | null;
  foto_url?: string | null;
  fornecedor_id?: number | null;
  preco_tabela?: number | null;
  venda_granel?: boolean;
  preco_kg_granel?: number | null;
  estoque_kg?: number;
  custo_medio_kg?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  suppliers?: number[];
  supplier_labels?: { id: number; name: string }[];
}

export interface ProductFilters {
  q?: string;
  categoria?: string;
  ativo?: string;
  limit?: number;
  offset?: number;
  meta?: "1";
  fields?: string;
  supplier_id?: number;
}

// Pedidos / Orders
export type PedidoTipo = "VENDA" | "COMPRA";
export type PedidoStatus = "rascunho" | "confirmado" | "cancelado" | string;

export interface PedidoItem {
  id?: number;
  pedido_id?: number;
  produto_id: number;
  produto_nome?: string;
  quantidade: number;
  preco_unitario: number;
  desconto_unitario?: number;
  total_item: number;
  custo_unit_venda?: number | null;
  custo_total_item?: number | null;
}

export interface PedidoPromissoria {
  id?: number;
  pedido_id?: number;
  seq: number;
  due_date: string;
  amount: number;
  paid_at?: string | null;
  status?: string;
}

export interface Order {
  id: number;
  tipo: PedidoTipo;
  status: PedidoStatus;
  partner_entity_id: number;
  partner_name: string | null;
  partner_document?: string | null;
  entidade_nome?: string | null;
  entidade_document?: string | null;
  entidade_email?: string | null;
  entidade_telefone?: string | null;
  entidade_cep?: string | null;
  data_emissao: string;
  data_entrega?: string | null;
  total_bruto: number;
  desconto_total: number;
  total_liquido: number;
  frete_total?: number | null;
  observacao?: string | null;
  tem_nota_fiscal?: boolean | null;
  parcelado?: boolean | null;
  numero_promissorias?: number | null;
  valor_por_promissoria?: number | null;
  data_primeira_promissoria?: string | null;
  created_at?: string;
  updated_at?: string;
  itens?: PedidoItem[];
  promissorias?: PedidoPromissoria[];
}

export interface OrderFilters {
  tipo?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  meta?: "1";
}

// Despesas
export interface Despesa {
  id: number;
  descricao: string;
  categoria: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  fornecedor_id: number | null;
  fornecedor_name?: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface DespesaFilters {
  categoria?: string;
  status?: string;
  mes?: number;
  ano?: number;
  fornecedor_id?: number;
  page?: number;
  limit?: number;
}
