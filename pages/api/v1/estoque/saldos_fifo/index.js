// pages/api/v1/estoque/saldos_fifo/index.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ error: `Method "${req.method}" not allowed` });
  }
  try {
    const { produto_id, include_lotes } = req.query;
    if (!produto_id)
      return res.status(400).json({ error: "produto_id é obrigatório" });
    const produtoId = Number(produto_id);
    if (!Number.isFinite(produtoId))
      return res.status(400).json({ error: "produto_id inválido" });

    // Verifica existência do produto
    const prod = await database.query({
      text: "SELECT id FROM produtos WHERE id=$1",
      values: [produtoId],
    });
    if (prod.rowCount === 0)
      return res.status(404).json({ error: "Produto não encontrado" });

    // Agrega lotes disponíveis (poderíamos considerar todos; por ora apenas disponíveis)
    const lotesQ = await database.query({
      text: `SELECT id, quantidade_inicial, quantidade_disponivel, custo_unitario, valor_total, origem_tipo, origem_movimento_id, data_entrada
             FROM estoque_lote
             WHERE produto_id=$1
             ORDER BY data_entrada ASC, id ASC`,
      values: [produtoId],
    });

    let quantidadeTotal = 0;
    let valorTotal = 0;
    for (const l of lotesQ.rows) {
      quantidadeTotal += Number(l.quantidade_disponivel);
      // valor_total proporcional ao saldo remanescente: custo_unitario * quantidade_disponivel
      valorTotal += Number(l.custo_unitario) * Number(l.quantidade_disponivel);
    }

    const custoMedio =
      quantidadeTotal > 0 ? valorTotal / quantidadeTotal : null;

    const payload = {
      produto_id: produtoId,
      quantidade_total: quantidadeTotal,
      valor_total: Number(valorTotal.toFixed(4)),
      custo_medio: custoMedio != null ? Number(custoMedio.toFixed(4)) : null,
    };

    if (String(include_lotes) === "1") {
      payload.lotes = lotesQ.rows.map((l) => ({
        id: l.id,
        quantidade_inicial: Number(l.quantidade_inicial),
        quantidade_disponivel: Number(l.quantidade_disponivel),
        custo_unitario: Number(l.custo_unitario),
        valor_total: Number(l.custo_unitario) * Number(l.quantidade_disponivel),
        origem_tipo: l.origem_tipo,
        origem_movimento_id: l.origem_movimento_id,
        data_entrada: l.data_entrada,
      }));
    }

    return res.status(200).json(payload);
  } catch (e) {
    console.error("GET /estoque/saldos_fifo error", e);
    if (isRelationMissing(e)) {
      return res.status(503).json({
        error: "Schema not migrated (estoque_lote or produtos missing)",
        dependency: "database",
        code: e.code,
        action: "Run migrations endpoint or apply migrations before use",
      });
    }
    if (isConnectionError(e)) {
      return res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: e.code,
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
      });
    }
    return res.status(500).json({ error: "Internal error" });
  }
}
