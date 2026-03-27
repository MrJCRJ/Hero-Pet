import { z } from "zod";

export const BotClienteTipoEnum = z.enum(["pessoa_fisica", "pessoa_juridica"]);

export const BotClienteSchema = z.object({
  telefone: z.string().min(8),
  nome: z.string().min(2).optional(),
  tipo: BotClienteTipoEnum.optional(),
});

export const BotClienteQuerySchema = z.object({
  telefone: z.string().min(8),
});

export const BotEnderecoSchema = z.object({
  cliente_id: z.coerce.number().int().positive(),
  logradouro: z.string().min(3),
  numero: z.string().min(1),
  bairro: z.string().min(2),
  cidade: z.string().min(2),
  uf: z.string().length(2),
  cep: z.string().min(8),
});

export const BotPedidoItemSchema = z.object({
  produto_id: z.coerce.number().int().positive(),
  quantidade_kg: z.coerce.number().positive(),
  preco_unitario_kg: z.coerce.number().nonnegative(),
});

export const BotPedidoSchema = z.object({
  cliente_id: z.coerce.number().int().positive(),
  endereco_id: z.coerce.number().int().positive().optional(),
  itens: z.array(BotPedidoItemSchema).min(1),
  horario_entrega: z.string().optional(),
  forma_pagamento: z.enum(["dinheiro", "pix", "cartao"]),
  observacoes: z.string().optional(),
});

export const BotProdutosQuerySchema = z.object({
  categoria: z.string().optional(),
  include_estoque: z
    .string()
    .optional()
    .transform((value) => {
      if (value == null) return undefined;
      if (value === "true" || value === "1") return true;
      if (value === "false" || value === "0") return false;
      return undefined;
    }),
  granel: z
    .string()
    .optional()
    .transform((value) => {
      if (value == null) return undefined;
      if (value === "true" || value === "1") return true;
      if (value === "false" || value === "0") return false;
      return undefined;
    }),
});

export const BotEstoqueQuerySchema = z.object({
  produto_id: z.coerce.number().int().positive(),
});

export const BotPedidosQuerySchema = z.object({
  status: z.string().optional(),
  cliente_id: z.coerce.number().int().positive().optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
});
