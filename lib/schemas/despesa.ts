import { z } from "zod";

/**
 * Schema Zod para despesas (POST/PUT).
 */
export const despesaSchema = z.object({
  descricao: z.string().trim().min(1, "Descrição é obrigatória"),
  categoria: z.string().min(1, "Categoria é obrigatória"),
  valor: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? parseFloat(v) : v))
    .refine((n) => Number.isFinite(n) && n > 0, "Valor inválido"),
  data_vencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  data_pagamento: z.string().optional().nullable(),
  status: z
    .enum(["pendente", "pago", "vencido", "cancelado"])
    .optional()
    .default("pendente"),
  fornecedor_id: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => (v == null || v === "" ? null : Number(v))),
  observacao: z.string().optional().nullable(),
  recorrente: z.boolean().optional().default(false),
  recorrencia_frequencia: z.enum(["mensal", "anual"]).optional().nullable(),
  recorrencia_dia: z.number().min(1).max(31).optional().nullable(),
  recorrencia_mes: z.number().min(1).max(12).optional().nullable(),
});

export type DespesaInput = z.infer<typeof despesaSchema>;
export type DespesaUpdateInput = Partial<DespesaInput>;

export function parseDespesaBody(body: unknown): { success: true; data: DespesaInput } | { success: false; error: z.ZodError } {
  const result = despesaSchema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error };
}
