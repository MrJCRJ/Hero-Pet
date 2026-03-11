// pages/api/v1/pedidos/[id]/fifo_debug.ts
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
  const id = Number(req.query?.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  try {
    const head = await database.query({
      text: `SELECT * FROM pedidos WHERE id = $1`,
      values: [id],
    });
    if (!head.rows.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const pedido = head.rows[0] as Record<string, unknown>;
    const docTag = `PEDIDO:${id}`;

    const movimentos = await database.query({
      text: `SELECT m.id, m.quantidade, m.custo_unitario_rec, m.custo_total_rec,
                    COALESCE((SELECT COUNT(*) FROM movimento_consumo_lote mc WHERE mc.movimento_id = m.id),0) AS pivots
             FROM movimento_estoque m
             WHERE m.documento = $1 AND m.tipo='SAIDA'
             ORDER BY m.id`,
      values: [docTag],
    });

    const itens = await database.query({
      text: `SELECT pi.produto_id, pi.quantidade,
                    COALESCE((SELECT SUM(quantidade_disponivel) FROM estoque_lote l WHERE l.produto_id = pi.produto_id),0) AS disponivel_lotes
             FROM pedido_itens pi WHERE pi.pedido_id = $1 ORDER BY pi.id`,
      values: [id],
    });

    const movRows = movimentos.rows as Array<Record<string, unknown>>;
    const anySaida = movRows.length > 0;
    const anySaidaSemPivot = movRows.some((m) => Number(m.pivots) === 0);
    const todasSaidasComCusto = movRows.every(
      (m) => m.custo_total_rec != null && Number(m.custo_total_rec) > 0
    );
    const todasSaidasComPivot = movRows.every((m) => Number(m.pivots) > 0);
    let fifo_aplicado = false;
    if (pedido.tipo === "COMPRA") fifo_aplicado = true;
    else if (anySaida && todasSaidasComCusto && todasSaidasComPivot)
      fifo_aplicado = true;

    const itemRows = itens.rows as Array<Record<string, unknown>>;
    let eligible = false;
    if (
      !fifo_aplicado &&
      pedido.tipo === "VENDA" &&
      anySaida &&
      anySaidaSemPivot
    ) {
      eligible = itemRows.every(
        (it) => Number(it.disponivel_lotes) >= Number(it.quantidade)
      );
    }
    const fifo_state = fifo_aplicado
      ? "fifo"
      : pedido.tipo === "VENDA"
        ? eligible
          ? "eligible"
          : "legacy"
        : "fifo";

    res.status(200).json({
      pedido_id: id,
      tipo: pedido.tipo,
      fifo_aplicado,
      fifo_state,
      movimentos: movRows.map((m) => ({
        ...m,
        has_pivots: Number(m.pivots) > 0,
      })),
      itens: itemRows,
      eligibility: {
        anySaida,
        anySaidaSemPivot,
        todasSaidasComCusto,
        todasSaidasComPivot,
        itemsAllCovered: itemRows.every(
          (it) => Number(it.disponivel_lotes) >= Number(it.quantidade)
        ),
      },
    });
  } catch (e) {
    console.error("GET /pedidos/:id/fifo_debug error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e))
      res.status(503).json({
        error: "Schema not migrated",
        dependency: "database",
        code: err.code,
        action: "Run migrations",
      });
    else if (isConnectionError(e))
      res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
      });
    else res.status(500).json({ error: "Internal error" });
  }
}
