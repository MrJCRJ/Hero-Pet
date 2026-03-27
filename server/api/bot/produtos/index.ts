import database from "infra/database";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { BotProdutosQuerySchema } from "@/server/api/bot/schemas";

function isGranelProduct(nome: string, categoria: string): boolean {
  const text = `${nome} ${categoria}`.toLowerCase();
  return text.includes("granel") || text.includes("kg");
}

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }

  const parsed = BotProdutosQuerySchema.safeParse(req.query ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid query" });
    return;
  }

  try {
    const filters: string[] = ["ativo = true"];
    const values: unknown[] = [];

    const categoria = parsed.data.categoria?.trim();
    if (categoria) {
      values.push(`%${categoria}%`);
      filters.push(`categoria ILIKE $${values.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await database.query({
      text: `SELECT id, nome, categoria, preco_tabela, ativo
             FROM produtos
             ${where}
             ORDER BY nome ASC
             LIMIT 500`,
      values,
    });

    let produtos = (result.rows as Array<Record<string, unknown>>).map((row) => ({
      id: Number(row.id),
      nome: String(row.nome ?? ""),
      categoria: String(row.categoria ?? ""),
      preco_kg: Number(row.preco_tabela ?? 0),
      ativo: Boolean(row.ativo),
      granel: isGranelProduct(String(row.nome ?? ""), String(row.categoria ?? "")),
    }));

    if (typeof parsed.data.granel === "boolean") {
      produtos = produtos.filter((item) => item.granel === parsed.data.granel);
    }

    res.status(200).json(produtos);
  } catch (error) {
    console.error("[bot/produtos] error", error);
    res.status(500).json({ error: "Internal error" });
  }
}
