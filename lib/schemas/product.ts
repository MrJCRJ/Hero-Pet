import { z } from "zod";

/**
 * Schema Zod para POST de produtos.
 */
export const productSchema = z
  .object({
    nome: z
      .string()
      .transform((s) => (s || "").trim())
      .refine((s) => s.length > 0, "nome is required"),
    descricao: z.string().optional().nullable(),
    codigo_barras: z.string().optional().nullable(),
    categoria: z.string().optional().nullable(),
    fornecedor_id: z
      .union([z.number(), z.string()])
      .optional()
      .nullable()
      .transform((v) => (v == null ? null : Number(v))),
    suppliers: z
      .array(z.union([z.number(), z.string()]).transform((v) => Number(v)))
      .optional()
      .default([])
      .transform((arr) =>
        Array.from(new Set(arr.filter((n) => Number.isFinite(n) && n > 0)))
      ),
    preco_tabela: z
      .union([z.number(), z.string()])
      .optional()
      .nullable()
      .transform((v) => (v == null ? null : Number(v))),
    markup_percent_default: z
      .union([z.number(), z.string()])
      .optional()
      .nullable()
      .transform((v) => (v == null ? null : Number(v))),
    estoque_minimo: z
      .union([z.number(), z.string()])
      .optional()
      .nullable()
      .transform((v) => (v == null ? null : Number(v))),
    ativo: z.boolean().optional().default(true),
  })
  .refine(
  (data) => data.fornecedor_id != null || (data.suppliers && data.suppliers.length > 0),
  {
    message:
      "Pelo menos um fornecedor é obrigatório (fornecedor_id ou suppliers[])",
  }
);

export type ProductInput = z.infer<typeof productSchema>;

/**
 * Faz parse do body e retorna dados validados ou erro Zod.
 */
export function parseProductBody(
  body: unknown
): { success: true; data: ProductInput } | { success: false; error: z.ZodError } {
  const result = productSchema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error };
}
