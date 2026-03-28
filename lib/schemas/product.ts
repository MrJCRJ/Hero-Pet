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
    categoria: z.string().optional().nullable(),
    fabricante: z.string().optional().nullable(),
    foto_url: z.string().optional().nullable(),
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
    ativo: z.boolean().optional().default(true),
    venda_granel: z.boolean().optional().default(false),
    preco_kg_granel: z
      .union([z.number(), z.string()])
      .optional()
      .nullable()
      .transform((v) => (v == null || v === "" ? null : Number(v))),
    estoque_kg: z
      .union([z.number(), z.string()])
      .optional()
      .transform((v) => (v == null || v === "" ? 0 : Number(v))),
    custo_medio_kg: z
      .union([z.number(), z.string()])
      .optional()
      .transform((v) => (v == null || v === "" ? 0 : Number(v))),
  })
  .refine(
    (data) =>
      data.fornecedor_id != null ||
      (data.suppliers && data.suppliers.length > 0),
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
):
  | { success: true; data: ProductInput }
  | { success: false; error: z.ZodError } {
  const result = productSchema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error };
}
