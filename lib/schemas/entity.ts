import { z } from "zod";
import { stripDigits, classifyDocument } from "../validation/document";

/**
 * Schema Zod para POST/PUT de entities.
 * Aceita documento pendente/vazio ou com 11 (CPF) ou 14 (CNPJ) dígitos.
 * Validade algorítmica é derivada no backend (status provisional vs valid).
 */
export const entitySchema = z
  .object({
    name: z
      .string()
      .transform((s) => (s || "").trim().toUpperCase())
      .refine((s) => s.length > 0, "Name is required"),
    entity_type: z.enum(["PF", "PJ"], {
      message: "entity_type must be PF or PJ",
    }),
    document_digits: z.string().optional().default(""),
    document_pending: z.boolean().optional().default(false),
    cep: z.string().optional().nullable(),
    telefone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    numero: z.string().optional().nullable(),
    complemento: z.string().optional().nullable(),
    observacao: z.string().optional().nullable(),
    ativo: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      const digits = stripDigits(data.document_digits || "");
      if (data.document_pending || !digits) return true;
      const len = digits.length;
      return len === 11 || len === 14;
    },
    { message: "Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos" }
  )
  .transform((data) => ({
    ...data,
    document_digits: stripDigits(data.document_digits || ""),
  }));

export type EntityInput = z.infer<typeof entitySchema>;

/**
 * Faz parse do body e retorna dados validados ou erro Zod.
 */
export function parseEntityBody(body: unknown): { success: true; data: EntityInput } | { success: false; error: z.ZodError } {
  const result = entitySchema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error };
}

/**
 * Deriva document_status para insert/update (compatível com API atual).
 */
export function deriveDocumentStatus(rawDigits: string, pendingFlag: boolean): string {
  const r = classifyDocument(rawDigits, pendingFlag);
  return r.status;
}
