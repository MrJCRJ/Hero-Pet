-- Golden dataset de referência — Relatórios Hero-Pet
-- Uso: documentação de reconciliação e queries esperadas alinhadas aos handlers em server/api/v1/relatorios/.
-- Os testes automatizados em tests/api/v1/relatorios/ criam dados via API (menos frágil com FKs);
-- este arquivo descreve o SQL equivalente para validação manual em staging.

-- =============================================================================
-- Parâmetros de exemplo (ajustar para o período sob teste)
-- mes = 4, ano = 2025  => firstDay = '2025-04-01', lastDay = '2025-05-01' (exclusivo)
-- =============================================================================

-- RECEITA (DRE, ranking totalGeral, margem receita por linha)
-- Fonte: pedidos tipo VENDA, status confirmado, data_emissao em [firstDay, lastDay)
/*
SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS receita_periodo
FROM pedidos
WHERE tipo = 'VENDA' AND status = 'confirmado'
  AND data_emissao >= :firstDay AND data_emissao < :lastDay;
*/

-- COGS (DRE, ranking por cliente, margem por produto)
/*
SELECT COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs_periodo
FROM pedido_itens i
JOIN pedidos p ON p.id = i.pedido_id
WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
  AND p.data_emissao >= :firstDay AND p.data_emissao < :lastDay;
*/

-- DESPESAS OPERACIONAIS (DRE — exclui devolução de capital)
/*
SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS despesas_operacionais
FROM despesas
WHERE data_vencimento >= :firstDay AND data_vencimento < :lastDay
  AND (categoria IS NULL OR categoria::text != 'devolucao_capital');
*/

-- DRE — valores esperados (derivados no handler, 2 casas decimais)
-- lucroBruto = receita_periodo - cogs_periodo
-- lucroOperacional = lucroBruto - despesas_operacionais - 0 (impostos)
-- margemBruta% = receita > 0 ? (lucroBruto / receita) * 100 : 0

-- RANKING — total geral de vendas (deve coincidir com soma de todas as vendas do período, não só top N)
-- Mesma query de RECEITA acima.

-- MARGEM POR PRODUTO — por linha (produto_id)
/*
SELECT i.produto_id,
       COALESCE(SUM(i.total_item),0) AS receita,
       COALESCE(SUM(i.custo_total_item),0) AS cogs,
       (COALESCE(SUM(i.total_item),0) - COALESCE(SUM(i.custo_total_item),0)) AS lucro
FROM pedido_itens i
JOIN pedidos pdr ON pdr.id = i.pedido_id
WHERE pdr.tipo = 'VENDA' AND pdr.status = 'confirmado'
  AND pdr.data_emissao >= :firstDay AND pdr.data_emissao < :lastDay
GROUP BY i.produto_id;
-- margem% = receita > 0 ? (lucro/receita)*100 : 0
-- participacaoVendas% no API = receita_linha / totalReceita_conjunto_retornado (top LIMIT)
*/

-- FLUXO DE CAIXA — saldo e movimentos dependem de regras parcelado/promissórias;
-- ver server/api/v1/relatorios/fluxo-caixa/index.ts para o detalhamento.
