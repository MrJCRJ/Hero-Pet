import { z } from "zod";

const PeriodoSchema = z.object({
  inicio: z.string(),
  fim: z.string(),
  tipo: z.string(),
});

export const RelatorioConsolidadoSchema = z.object({
  schema_version: z.string(),
  empresa: z.string(),
  periodo: PeriodoSchema,
  data_geracao: z.string(),
  resumo: z.object({
    saldo_caixa: z.number(),
    fluxo_operacional: z.number(),
    margem_bruta: z.number(),
    margem_operacional: z.number(),
    lucro_bruto: z.number(),
    lucro_operacional: z.number(),
  }),
  dre: z.object({
    receitas: z.number(),
    custos_vendas: z.number(),
    lucro_bruto: z.number(),
    despesas: z.number(),
    lucro_operacional: z.number(),
    margem_bruta: z.number(),
    margem_operacional: z.number(),
  }),
  fluxo_caixa: z.object({
    saldo_inicial: z.number(),
    saldo_final: z.number(),
    entradas: z.object({
      vendas: z.number(),
      promissorias_recebidas: z.number(),
      aportes_capital: z.number(),
      total: z.number(),
    }),
    saidas: z.object({
      compras: z.number(),
      despesas: z.number(),
      total: z.number(),
    }),
  }),
  indicadores: z.object({
    pmr: z.number().nullable(),
    pmp: z.number().nullable(),
    dve: z.number().nullable(),
    giro_estoque: z.number().nullable(),
  }),
  margem_produto: z.array(
    z.object({
      produto_id: z.number(),
      nome: z.string(),
      receita: z.number(),
      cogs: z.number(),
      lucro: z.number(),
      margem: z.number(),
      participacao_vendas: z.number(),
    })
  ),
  ranking_clientes: z.array(
    z.object({
      entity_id: z.number(),
      nome: z.string(),
      total: z.number(),
      margem_bruta: z.number().nullable(),
    })
  ),
});
