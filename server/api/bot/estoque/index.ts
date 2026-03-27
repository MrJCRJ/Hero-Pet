import database from "infra/database";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { BotEstoqueQuerySchema } from "@/server/api/bot/schemas";

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }

  const parsed = BotEstoqueQuerySchema.safeParse(req.query ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid query" });
    return;
  }

  try {
    const produtoId = parsed.data.produto_id;
    const produto = await database.query({
      text: `SELECT id, nome FROM produtos WHERE id = $1`,
      values: [produtoId],
    });
    if (!produto.rows.length) {
      res.status(404).json({ error: "Produto nao encontrado" });
      return;
    }

    const saldo = await database.query({
      text: `SELECT
               COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN quantidade WHEN tipo = 'SAIDA' THEN -quantidade ELSE quantidade END), 0) AS saldo
             FROM movimento_estoque
             WHERE produto_id = $1`,
      values: [produtoId],
    });

    res.status(200).json({
      produto_id: produtoId,
      estoque_kg: Number((saldo.rows[0] as Record<string, unknown>).saldo ?? 0),
    });
  } catch (error) {
    console.error("[bot/estoque] error", error);
    res.status(500).json({ error: "Internal error" });
  }
}
