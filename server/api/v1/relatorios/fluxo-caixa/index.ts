import database from "infra/database.js";
import { getReportBounds } from "@/lib/relatorios/dateBounds";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function fluxoCaixaHandler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const format = (req.query?.format as string) || "json";
  if (format === "pdf" || format === "xlsx") {
    if (res.setHeader) res.setHeader("Deprecation", "true");
    res.status(400).json({ erro: "Use o relatório consolidado em JSON" });
    return;
  }

  try {
    const now = new Date();
    const mes = Number(req.query?.mes) ?? now.getMonth() + 1;
    const ano = Number(req.query?.ano) ?? now.getFullYear();
    const { firstDay, lastDay } = getReportBounds(mes, ano);

    // Saldo inicial + dados para reconciliação DRE x Fluxo
    const [entAntR, promAntR, aportAntR, compAntR, despAntR, vendasR, promPagosR, aportesR, comprasR, despesasR, estoqueCustoR, estoqueVendaR, evolucaoMensalR, receitasR, cogsR, crInicialR, crFinalR] = await Promise.all([
      database.query({
        text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado' AND data_emissao < $1
               AND (parcelado = false OR parcelado IS NULL)`,
        values: [firstDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(pp.amount),0)::numeric(14,2) AS total FROM pedido_promissorias pp
               JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'VENDA'
               WHERE pp.paid_at IS NOT NULL AND pp.paid_at < $1::date`,
        values: [firstDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total FROM aportes_capital WHERE data < $1::date`,
        values: [firstDay],
      }).catch(() => ({ rows: [{ total: 0 }] })),
      database.query({
        text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos WHERE tipo = 'COMPRA' AND status = 'confirmado' AND data_emissao < $1`,
        values: [firstDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total FROM despesas WHERE data_vencimento < $1`,
        values: [firstDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos
               WHERE tipo = 'VENDA' AND status = 'confirmado'
                 AND data_emissao >= $1 AND data_emissao < $2
                 AND (parcelado = false OR parcelado IS NULL)`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(CASE WHEN pp.paid_at IS NOT NULL AND pp.paid_at >= $1::date AND pp.paid_at < $2::date THEN pp.amount ELSE 0 END),0)::numeric(14,2) AS total
               FROM pedido_promissorias pp
               JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'VENDA'`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total
               FROM aportes_capital
               WHERE data >= $1::date AND data < $2::date`,
        values: [firstDay, lastDay],
      }).catch(() => ({ rows: [{ total: 0 }] })),
      database.query({
        text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos WHERE tipo = 'COMPRA' AND status = 'confirmado'
               AND data_emissao >= $1 AND data_emissao < $2`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total
               FROM despesas WHERE data_vencimento >= $1 AND data_vencimento < $2`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(saldo * COALESCE(custo_medio, 0)), 0)::numeric(14,2) AS total
               FROM (
                 SELECT p.id,
                   COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.quantidade WHEN m.tipo='SAIDA' THEN -m.quantidade ELSE m.quantidade END), 0)::numeric(14,3) AS saldo,
                   (SELECT COALESCE(SUM(valor_total),0)/NULLIF(SUM(quantidade),0) FROM movimento_estoque WHERE produto_id = p.id AND tipo = 'ENTRADA')::numeric(14,2) AS custo_medio
                 FROM produtos p
                 LEFT JOIN movimento_estoque m ON m.produto_id = p.id
                 WHERE p.ativo = true
                 GROUP BY p.id
               ) sub`,
      }).catch(() => ({ rows: [{ total: 0 }] })),
      database.query({
        text: `SELECT COALESCE(SUM(saldo * preco_venda), 0)::numeric(14,2) AS total
               FROM (
                 SELECT p.id,
                   COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.quantidade WHEN m.tipo='SAIDA' THEN -m.quantidade ELSE m.quantidade END), 0)::numeric(14,3) AS saldo,
                   COALESCE(
                     NULLIF(p.preco_tabela, 0),
                     (SELECT COALESCE(SUM(valor_total),0)/NULLIF(SUM(quantidade),0) FROM movimento_estoque me WHERE me.produto_id = p.id AND me.tipo = 'ENTRADA')::numeric(14,2) * 1.2,
                     0
                   )::numeric(14,2) AS preco_venda
                 FROM produtos p
                 LEFT JOIN movimento_estoque m ON m.produto_id = p.id
                 WHERE p.ativo = true
                 GROUP BY p.id, p.preco_tabela
               ) sub
               WHERE saldo > 0`,
      }).catch(() => ({ rows: [{ total: 0 }] })),
      database.query({
        text: `WITH series AS (
                 SELECT generate_series(
                   date_trunc('month',$1::date)::timestamp,
                   (date_trunc('month',$2::date) - interval '1 month')::timestamp,
                   interval '1 month'
                 ) AS mstart
               )
               SELECT to_char(s.mstart, 'YYYY-MM') AS mes,
                 (SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0) FROM pedidos
                  WHERE tipo='VENDA' AND status='confirmado' AND data_emissao >= s.mstart AND data_emissao < s.mstart + interval '1 month'
                  AND (parcelado = false OR parcelado IS NULL))::numeric(14,2) +
                 (SELECT COALESCE(SUM(pp.amount),0) FROM pedido_promissorias pp
                  JOIN pedidos p ON p.id=pp.pedido_id AND p.tipo='VENDA'
                  WHERE pp.paid_at >= s.mstart AND pp.paid_at < s.mstart + interval '1 month')::numeric(14,2) +
                 COALESCE((SELECT SUM(valor) FROM aportes_capital WHERE data >= s.mstart AND data < s.mstart + interval '1 month'),0)::numeric(14,2) AS entradas,
                 (SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0) FROM pedidos
                  WHERE tipo='COMPRA' AND status='confirmado' AND data_emissao >= s.mstart AND data_emissao < s.mstart + interval '1 month')::numeric(14,2) +
                 COALESCE((SELECT SUM(valor) FROM despesas WHERE data_vencimento >= s.mstart AND data_vencimento < s.mstart + interval '1 month'),0)::numeric(14,2) AS saidas
               FROM series s
               ORDER BY s.mstart`,
        values: [firstDay, lastDay],
      }).catch((err) => {
        console.warn("fluxo-caixa evolucaoMensal query error:", (err as Error)?.message);
        return { rows: [] };
      }),
      database.query({
        text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
               AND data_emissao >= $1 AND data_emissao < $2`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs
               FROM pedido_itens i JOIN pedidos p ON p.id = i.pedido_id
               WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
               AND p.data_emissao >= $1 AND p.data_emissao < $2`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(pp.amount),0)::numeric(14,2) AS total
               FROM pedido_promissorias pp JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'VENDA'
               WHERE pp.paid_at IS NULL OR pp.paid_at >= $1::date`,
        values: [firstDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(pp.amount),0)::numeric(14,2) AS total
               FROM pedido_promissorias pp JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'VENDA'
               WHERE pp.paid_at IS NULL OR pp.paid_at >= $1::date`,
        values: [lastDay],
      }),
    ]);

    const entAnt = Number((entAntR.rows[0] as Record<string, unknown>)?.total || 0);
    const promAnt = Number((promAntR.rows[0] as Record<string, unknown>)?.total || 0);
    const aportAnt = Number((aportAntR.rows[0] as Record<string, unknown>)?.total || 0);
    const compAnt = Number((compAntR.rows[0] as Record<string, unknown>)?.total || 0);
    const despAnt = Number((despAntR.rows[0] as Record<string, unknown>)?.total || 0);
    const saldoInicial = Number((entAnt + promAnt + aportAnt - compAnt - despAnt).toFixed(2));

    const vendas = Number((vendasR.rows[0] as Record<string, unknown>)?.total || 0);
    const promissoriasRecebidas = Number((promPagosR.rows[0] as Record<string, unknown>)?.total || 0);
    const aportesCapital = Number((aportesR.rows[0] as Record<string, unknown>)?.total || 0);
    const compras = Number((comprasR.rows[0] as Record<string, unknown>)?.total || 0);
    const despesas = Number((despesasR.rows[0] as Record<string, unknown>)?.total || 0);
    const entradas = Number((vendas + promissoriasRecebidas + aportesCapital).toFixed(2));
    const saidas = Number((compras + despesas).toFixed(2));
    const saldo = Number((entradas - saidas).toFixed(2));
    const saldoFinal = Number((saldoInicial + saldo).toFixed(2));

    const fluxoOperacional = Number((vendas + promissoriasRecebidas - compras - despesas).toFixed(2));
    const fluxoFinanciamento = aportesCapital;
    const fluxoInvestimento = 0;

    const receitas = Number((receitasR.rows[0] as Record<string, unknown>)?.total || 0);
    const custosVendas = Number((cogsR.rows[0] as Record<string, unknown>)?.cogs || 0);
    const lucroOperacional = Number((receitas - custosVendas - despesas).toFixed(2));

    const valorEstoque = Number((estoqueCustoR.rows[0] as Record<string, unknown>)?.total || 0);
    const contasReceberInicial = Number((crInicialR.rows[0] as Record<string, unknown>)?.total || 0);
    const contasReceberFinal = Number((crFinalR.rows[0] as Record<string, unknown>)?.total || 0);
    const variacaoContasReceber = Number((contasReceberInicial - contasReceberFinal).toFixed(2));

    const variacaoEstoque = Number((compras - custosVendas).toFixed(2));

    const conciliacao = {
      lucroOperacional,
      variacaoContasReceber,
      variacaoEstoque,
      contasReceberInicial,
      contasReceberFinal,
    };
    const valorPresumidoVendaEstoque = Number((estoqueVendaR.rows[0] as Record<string, unknown>)?.total || 0);

    let saldoAcum = saldoInicial;
    const evolucaoMensal = ((evolucaoMensalR.rows || []) as Array<Record<string, unknown>>).map((r) => {
      const ent = Number(r.entradas || 0);
      const sai = Number(r.saidas || 0);
      const saldoMes = Number((ent - sai).toFixed(2));
      saldoAcum = Number((saldoAcum + saldoMes).toFixed(2));
      return {
        mes: String(r.mes ?? ""),
        entradas: ent,
        saidas: sai,
        saldoPeriodo: saldoMes,
        saldoAcumulado: saldoAcum,
      };
    });

    const compare = req.query?.compare === "1" || req.query?.compare === "ano_anterior";
    const incluirComparacao = compare;
    let fluxoAnterior: { saldo: number; entradas: number; saidas: number } | null = null;
    if (incluirComparacao) {
      const { firstDay: fa, lastDay: la } = getReportBounds(mes, ano - 1);
      const [vendasAnt, promAnt, aportAnt, compAnt, despAnt] = await Promise.all([
        database.query({
          text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
                 FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
                 AND data_emissao >= $1 AND data_emissao < $2
                 AND (parcelado = false OR parcelado IS NULL)`,
          values: [fa, la],
        }),
        database.query({
          text: `SELECT COALESCE(SUM(CASE WHEN pp.paid_at >= $1::date AND pp.paid_at < $2::date THEN pp.amount ELSE 0 END),0)::numeric(14,2) AS total
                 FROM pedido_promissorias pp JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'VENDA'`,
          values: [fa, la],
        }),
        database.query({ text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total FROM aportes_capital WHERE data >= $1 AND data < $2`, values: [fa, la] }).catch(() => ({ rows: [{ total: 0 }] })),
        database.query({
          text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
                 FROM pedidos WHERE tipo = 'COMPRA' AND status = 'confirmado'
                 AND data_emissao >= $1 AND data_emissao < $2`,
          values: [fa, la],
        }),
        database.query({
          text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total FROM despesas WHERE data_vencimento >= $1 AND data_vencimento < $2`,
          values: [fa, la],
        }),
      ]);
      const entA = Number((vendasAnt.rows[0] as Record<string, unknown>)?.total || 0) +
        Number((promAnt.rows[0] as Record<string, unknown>)?.total || 0) +
        Number((aportAnt.rows[0] as Record<string, unknown>)?.total || 0);
      const saiA = Number((compAnt.rows[0] as Record<string, unknown>)?.total || 0) +
        Number((despAnt.rows[0] as Record<string, unknown>)?.total || 0);
      fluxoAnterior = { saldo: Number((entA - saiA).toFixed(2)), entradas: entA, saidas: saiA };
    }
    const payload = {
      periodo: { mes, ano, firstDay, lastDay },
      fluxo: {
        saldoInicial,
        saldoFinal,
        entradas: { vendas, promissoriasRecebidas, aportesCapital, total: entradas },
        saidas: { compras, despesas, total: saidas },
        saldo,
        fluxoOperacional,
        fluxoFinanciamento,
        fluxoInvestimento,
        valorEstoque,
        valorPresumidoVendaEstoque,
        evolucaoMensal,
        conciliacao,
        ...(fluxoAnterior ? { fluxoAnterior } : {}),
      },
    };

    res.status(200).json(payload);
  } catch (e) {
    console.error("GET /relatorios/fluxo-caixa error", e);
    res.status(500).json({ error: "Erro ao gerar fluxo de caixa" });
  }
}
