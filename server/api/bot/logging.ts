import { createHash } from "node:crypto";

function hashPii(value: string): string {
  const salt = process.env.BOT_LOG_HASH_SALT || "bot-log-salt";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function sanitizeForBotLogs(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  if (typeof out.telefone === "string") out.telefone = hashPii(out.telefone);
  if (typeof out.nome === "string") out.nome = "[REDACTED]";
  if (typeof out.endereco === "string") out.endereco = "[REDACTED]";
  if (typeof out.logradouro === "string") out.logradouro = "[REDACTED]";
  return out;
}
