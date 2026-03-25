import { z } from "zod";

type QueryValue = string | string[] | undefined;
type QueryLike = Record<string, QueryValue> | undefined;

function firstValue(value: QueryValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseOptionalInt(value: QueryValue): { value: number | undefined; invalid: boolean } {
  const raw = firstValue(value);
  if (raw == null || raw === "") return { value: undefined, invalid: false };
  const num = Number(raw);
  if (!Number.isFinite(num)) return { value: undefined, invalid: true };
  return { value: num, invalid: false };
}

const BaseRelatorioQuerySchema = z.object({
  mes: z.number().int().min(0).max(12),
  ano: z.number().int().min(0).max(2100),
  format: z.enum(["json", "pdf", "xlsx"]).default("json"),
  compare: z.boolean().default(false),
  limit: z.number().int().min(5).max(100).optional(),
  tipo: z.enum(["vendas", "fornecedores"]).default("vendas"),
  saldoSocios: z.number().min(0).optional(),
});

export type RelatorioQueryParsed = z.infer<typeof BaseRelatorioQuerySchema>;

export interface ParseRelatorioOptions {
  defaultMes?: number;
  defaultAno?: number;
  defaultLimit?: number;
  defaultTipo?: "vendas" | "fornecedores";
  allowFormat?: boolean;
  allowCompare?: boolean;
  allowLimit?: boolean;
  allowTipo?: boolean;
  allowSaldoSocios?: boolean;
}

function toCompare(raw: string | undefined): boolean {
  if (!raw) return false;
  return raw === "1" || raw === "true" || raw === "ano_anterior";
}

export function parseRelatorioQuery(
  query: QueryLike,
  options: ParseRelatorioOptions = {}
):
  | { ok: true; data: RelatorioQueryParsed }
  | { ok: false; error: string } {
  const now = new Date();
  const mesDefault = options.defaultMes ?? now.getMonth() + 1;
  const anoDefault = options.defaultAno ?? now.getFullYear();
  const limitDefault = options.defaultLimit;
  const tipoDefault = options.defaultTipo ?? "vendas";
  const mesRaw = parseOptionalInt(query?.mes);
  const anoRaw = parseOptionalInt(query?.ano);
  const limitRaw = parseOptionalInt(query?.limit);
  const saldoRaw = firstValue(query?.saldoSocios);
  const saldoNum =
    saldoRaw == null || saldoRaw === ""
      ? undefined
      : Number.isFinite(Number(saldoRaw))
        ? Number(saldoRaw)
        : Number.NaN;

  const candidate = {
    mes: mesRaw.value ?? mesDefault,
    ano: anoRaw.value ?? anoDefault,
    format: firstValue(query?.format) ?? "json",
    compare: toCompare(firstValue(query?.compare)),
    limit: limitRaw.value ?? limitDefault,
    tipo: firstValue(query?.tipo) ?? tipoDefault,
    saldoSocios: saldoNum,
  };

  const schema = BaseRelatorioQuerySchema.superRefine((data, ctx) => {
    if (!options.allowFormat && data.format !== "json") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Formato não suportado para este endpoint.",
        path: ["format"],
      });
    }
    if (!options.allowCompare && data.compare) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Comparação não suportada para este endpoint.",
        path: ["compare"],
      });
    }
    if (!options.allowLimit && data.limit != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Parâmetro limit não suportado para este endpoint.",
        path: ["limit"],
      });
    }
    if (!options.allowTipo && data.tipo !== "vendas") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Parâmetro tipo não suportado para este endpoint.",
        path: ["tipo"],
      });
    }
    if (!options.allowSaldoSocios && data.saldoSocios != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Parâmetro saldoSocios não suportado para este endpoint.",
        path: ["saldoSocios"],
      });
    }
  });

  if (mesRaw.invalid || anoRaw.invalid || limitRaw.invalid || Number.isNaN(saldoNum)) {
    return { ok: false, error: "Parâmetros numéricos inválidos." };
  }

  const parsed = schema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Parâmetros inválidos." };
  }
  return { ok: true, data: parsed.data };
}
