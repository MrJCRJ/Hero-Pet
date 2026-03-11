// pages/api/v1/estoque/saldos_fifo/index.ts
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }
  try {
    const produto_id = req.query?.produto_id;
    const include_lotes = req.query?.include_lotes;
    if (!produto_id) {
      res.status(400).json({ error: "produto_id é obrigatório" });
      return;
    }
    const produtoId = Number(produto_id);
    if (!Number.isFinite(produtoId)) {
      res.status(400).json({ error: "produto_id inválido" });
      return;
    }

    const prod = await database.query({
      text: "SELECT id FROM produtos WHERE id=$1",
      values: [produtoId],
    });
    if (prod.rowCount === 0) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }

    const lotesQ = await database.query({
      text: `SELECT id, quantidade_inicial, quantidade_disponivel, custo_unitario, valor_total, origem_tipo, origem_movimento_id, data_entrada
             FROM estoque_lote
             WHERE produto_id=$1
             ORDER BY data_entrada ASC, id ASC`,
      values: [produtoId],
    });

    let quantidadeTotal = 0;
    let valorTotal = 0;
    for (const l of lotesQ.rows as Array<Record<string, unknown>>) {
      quantidadeTotal += Number(l.quantidade_disponivel);
      valorTotal +=
        Number(l.custo_unitario) * Number(l.quantidade_disponivel);
    }

    const custoMedio =
      quantidadeTotal > 0 ? valorTotal / quantidadeTotal : null;

    const payload: Record<string, unknown> = {
      produto_id: produtoId,
      quantidade_total: quantidadeTotal,
      valor_total: Number(valorTotal.toFixed(4)),
      custo_medio:
        custoMedio != null ? Number(custoMedio.toFixed(4)) : null,
    };

    if (String(include_lotes) === "1") {
      payload.lotes = (lotesQ.rows as Array<Record<string, unknown>>).map(
        (l) => ({
          id: l.id,
          quantidade_inicial: Number(l.quantidade_inicial),
          quantidade_disponivel: Number(l.quantidade_disponivel),
          custo_unitario: Number(l.custo_unitario),
          valor_total:
            Number(l.custo_unitario) * Number(l.quantidade_disponivel),
          origem_tipo: l.origem_tipo,
          origem_movimento_id: l.origem_movimento_id,
          data_entrada: l.data_entrada,
        })
      );
    }

    res.status(200).json(payload);
  } catch (e) {
    console.error("GET /estoque/saldos_fifo error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (estoque_lote or produtos missing)",
        dependency: "database",
        code: err.code,
        action: "Run migrations endpoint or apply migrations before use",
      });
      return;
    }
    if (isConnectionError(e)) {
      res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
      });
      return;
    }
    res.status(500).json({ error: "Internal error" });
  }
}
