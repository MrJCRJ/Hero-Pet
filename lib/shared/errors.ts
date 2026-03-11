/**
 * Utilitários de classificação de erros (DB, conexão, schema).
 */

export function isConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; errors?: unknown[] };
  const codes = ["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET"];
  if (e.code && codes.includes(e.code)) return true;
  if (err instanceof AggregateError) {
    for (const inner of err.errors || []) {
      const ie = inner as { code?: string };
      if (ie?.code && codes.includes(ie.code)) return true;
    }
  }
  return false;
}

export function isRelationMissing(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  return (err as { code?: string }).code === "42P01"; // undefined table
}
