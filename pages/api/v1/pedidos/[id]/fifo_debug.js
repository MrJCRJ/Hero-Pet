// pages/api/v1/pedidos/[id]/fifo_debug.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ error: `Method "${req.method}" not allowed` });
  const id = Number(req.query.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "invalid id" });
  try {
    const head = await database.query({
      text: `SELECT * FROM pedidos WHERE id = $1`,
      values: [id],
    });
    if (!head.rows.length) return res.status(404).json({ error: "Not found" });
    const pedido = head.rows[0];
    const docTag = `PEDIDO:${id}`;

    // Movimentos SAIDA + pivots
    const movimentos = await database.query({
      text: `SELECT m.id, m.quantidade, m.custo_unitario_rec, m.custo_total_rec,
                    COALESCE((SELECT COUNT(*) FROM movimento_consumo_lote mc WHERE mc.movimento_id = m.id),0) AS pivots
             FROM movimento_estoque m
             WHERE m.documento = $1 AND m.tipo='SAIDA'
             ORDER BY m.id`,
      values: [docTag],
    });

    // Itens + disponibilidade em lotes
    const itens = await database.query({
      text: `SELECT pi.produto_id, pi.quantidade,
                    COALESCE((SELECT SUM(quantidade_disponivel) FROM estoque_lote l WHERE l.produto_id = pi.produto_id),0) AS disponivel_lotes
             FROM pedido_itens pi WHERE pi.pedido_id = $1 ORDER BY pi.id`,
      values: [id],
    });

    // Reaplicar mesma lógica de fifo_aplicado (atual) + estado elegível
    const anySaida = movimentos.rows.length > 0;
    const anySaidaSemPivot = movimentos.rows.some(
      (m) => Number(m.pivots) === 0,
    );
    const todasSaidasComCusto = movimentos.rows.every(
      (m) => m.custo_total_rec != null && Number(m.custo_total_rec) > 0,
    );
    const todasSaidasComPivot = movimentos.rows.every(
      (m) => Number(m.pivots) > 0,
    );
    let fifo_aplicado = false;
    if (pedido.tipo === "COMPRA") fifo_aplicado = true;
    else if (anySaida && todasSaidasComCusto && todasSaidasComPivot)
      fifo_aplicado = true;

    // Elegível: VENDA, não aplicado, tem SAIDAS legacy (sem pivots) e cada item possui lotes suficientes
    let eligible = false;
    if (
      !fifo_aplicado &&
      pedido.tipo === "VENDA" &&
      anySaida &&
      anySaidaSemPivot
    ) {
      eligible = itens.rows.every(
        (it) => Number(it.disponivel_lotes) >= Number(it.quantidade),
      );
    }
    const fifo_state = fifo_aplicado
      ? "fifo"
      : pedido.tipo === "VENDA"
        ? eligible
          ? "eligible"
          : "legacy"
        : "fifo"; // COMPRA

    return res.status(200).json({
      pedido_id: id,
      tipo: pedido.tipo,
      fifo_aplicado,
      fifo_state,
      movimentos: movimentos.rows.map((m) => ({
        ...m,
        has_pivots: Number(m.pivots) > 0,
      })),
      itens: itens.rows,
      eligibility: {
        anySaida,
        anySaidaSemPivot,
        todasSaidasComCusto,
        todasSaidasComPivot,
        itemsAllCovered: itens.rows.every(
          (it) => Number(it.disponivel_lotes) >= Number(it.quantidade),
        ),
      },
    });
  } catch (e) {
    console.error("GET /pedidos/:id/fifo_debug error", e);
    if (isRelationMissing(e))
      return res.status(503).json({
        error: "Schema not migrated",
        dependency: "database",
        code: e.code,
        action: "Run migrations",
      });
    if (isConnectionError(e))
      return res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: e.code,
      });
    return res.status(500).json({ error: "Internal error" });
  }
}
