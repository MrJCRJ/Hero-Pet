// lib/fifo.js
// Funções utilitárias para consumo FIFO de lotes de estoque.
// Extraído de lógica existente em /pages/api/v1/estoque/movimentos para reutilização em criação/edição de pedidos.
// Mantém transação externa: caller deve abrir BEGIN / COMMIT e fornecer client.
// Assunções:
//  - Tabela estoque_lote já criada (migração fifo_phase1)
//  - Lotes com quantidade_disponivel > 0 participam do consumo.
//  - Ordenação por data_entrada ASC, id ASC.
// Retorna objeto com:
//  {
//    consumos: [{ lote_id, quantidade, custo_unitario, custo_total }],
//    custo_total: number,
//    custo_unitario_medio: number
//  }
// Lança erro custom { code: 'ESTOQUE_INSUFICIENTE' } se não houver saldo.

export async function consumirFIFO({ client, produtoId, quantidade }) {
  if (!client) throw new Error("client requerido");
  if (!Number.isFinite(quantidade) || quantidade <= 0)
    throw new Error("quantidade inválida para consumo FIFO");

  const lotesQ = await client.query({
    text: `SELECT id, quantidade_disponivel, custo_unitario
           FROM estoque_lote
           WHERE produto_id=$1 AND quantidade_disponivel > 0
           ORDER BY data_entrada ASC, id ASC
           FOR UPDATE`,
    values: [produtoId],
  });
  let restante = quantidade;
  const consumos = [];
  for (const lote of lotesQ.rows) {
    if (restante <= 0) break;
    const disponivel = Number(lote.quantidade_disponivel);
    if (disponivel <= 0) continue;
    const consumir = disponivel >= restante ? restante : disponivel;
    restante = Number((restante - consumir).toFixed(3));
    const custoUnit = Number(lote.custo_unitario);
    consumos.push({
      lote_id: lote.id,
      quantidade: consumir,
      custo_unitario: custoUnit,
      custo_total: Number((consumir * custoUnit).toFixed(4)),
    });
  }
  if (restante > 0) {
    const err = new Error("Estoque insuficiente para consumo FIFO");
    err.code = "ESTOQUE_INSUFICIENTE";
    throw err;
  }
  const custo_total = consumos.reduce((a, c) => a + c.custo_total, 0);
  const custo_unitario_medio = quantidade > 0 ? custo_total / quantidade : 0;
  return { consumos, custo_total, custo_unitario_medio };
}

export async function aplicarConsumosFIFO({ client, movimentoId, consumos }) {
  // Atualiza lotes e cria registros em movimento_consumo_lote
  for (const c of consumos) {
    await client.query({
      text: `UPDATE estoque_lote SET quantidade_disponivel = quantidade_disponivel - $1 WHERE id=$2`,
      values: [c.quantidade, c.lote_id],
    });
    await client.query({
      text: `INSERT INTO movimento_consumo_lote (movimento_id, lote_id, quantidade_consumida, custo_unitario_aplicado, custo_total)
             VALUES ($1,$2,$3,$4,$5)`,
      values: [
        movimentoId,
        c.lote_id,
        c.quantidade,
        c.custo_unitario,
        c.custo_total,
      ],
    });
  }
}
