import { buildJsonConsolidado } from "@/lib/relatorios/exportJsonConsolidado";

describe("buildJsonConsolidado (schema 1.4)", () => {
  it("inclui campos novos e mantém schema_version", () => {
    const payload = {
      periodo: { mes: 1, ano: 2026, firstDay: "2026-01-01", lastDay: "2026-02-01" },
      dre: {
        receitas: 1000,
        receitaBruta: 1000,
        receitaLiquida: 1000,
        custosVendas: 500,
        lucroBruto: 500,
        despesas: 200,
        impostos: 0,
        lucroOperacional: 300,
        ebitda: 300,
        margemBruta: 50,
        margemOperacional: 30,
      },
      fluxo: {
        saldoInicial: 0,
        saldoFinal: 0,
        entradas: { vendas: 1000, promissoriasRecebidas: 0, aportesCapital: 0, total: 1000 },
        saidas: { compras: 0, despesas: 0, devolucao_capital: 0, total: 0 },
        saldo: 0,
        fluxoOperacional: 0,
        evolucaoMensal: [],
      },
      indicadores: { pmr: 10, pmp: 20, giroEstoque: 3, dve: 12 },
      margem: { itens: [], totalReceita: 1000, margemMediaPonderada: 30 },
      ranking: { itens: [], totalGeral: 0 },
      serieDreMensal: {
        tipo: "ano_calendario_2026",
        intervalo: { inicio: "2026-01-01", fim_exclusivo: "2027-01-01" },
        meses: [
          {
            mes: "2026-01",
            periodo_inicio: "2026-01-01",
            periodo_fim_exclusivo: "2026-02-01",
            receitas: 100,
            custos_vendas: 50,
            despesas: 20,
            lucro_bruto: 50,
            lucro_operacional: 30,
            margem_bruta_pct: 50,
            margem_operacional_pct: 30,
          },
        ],
        totais_soma_meses: {
          mes: "TOTAL",
          periodo_inicio: "",
          periodo_fim_exclusivo: "",
          receitas: 100,
          custos_vendas: 50,
          despesas: 20,
          lucro_bruto: 50,
          lucro_operacional: 30,
          margem_bruta_pct: 50,
          margem_operacional_pct: 30,
        },
        ultimo_mes_com_dados: "2026-01",
        qtd_meses_sem_dados: 11,
        meses_com_zero: [],
      },
      indicadoresDerivadosBi: {
        ciclo_conversao_caixa_dias: null,
        giro_contas_receber: 2,
        indicadores_contexto: {
          confianca_baixa_ciclo: true,
          notas_confianca_baixa_ciclo: ["PMP esparso/distorsão"],
          compras_periodo: 400,
          vendas_periodo: 10000,
          pmr: 10,
          pmp: 50,
          dve: 10,
          ciclo_raw: -30,
        },
        formulas: {
          ciclo_conversao: "DVE + PMR - PMP (dias)",
          giro_cr: "vendas_periodo / media_contas_receber",
        },
      },
      metas: {
        periodo: { inicio: "2026-01-01", fim_exclusivo: "2026-02-01", tipo: "meses_1" },
        receita_meta: 15000,
        lucro_operacional_meta: 1500,
        margem_operacional_meta: 10,
        receita_realizado: 5816,
        lucro_operacional_realizado: 966.52,
        margem_operacional_realizado: 16.62,
        atingimento_receita_pct: 38.8,
        atingimento_lucro_operacional_pct: 64.4,
        variacao_receita_pct: -61.2,
        variacao_lucro_operacional_pct: -35.6,
        meses_meta_count: 1,
      },
      margemLiquidaPorClienteEstimado: {
        totais: {
          vendas_liquidas: 100,
          cogs: 50,
          frete_custo: 10,
          comissao_estimativa: 6,
          lucro_liquido_estimado: 34,
        },
        top_clientes: [
          {
            entity_id: 1,
            nome: "Cliente A",
            vendas_liquidas: 100,
            cogs: 50,
            frete_custo: 10,
            comissao_estimativa: 6,
            lucro_liquido_estimado: 34,
            margem_liquida_pct: 34,
          },
        ],
      },
    } as any;

    const json = buildJsonConsolidado(payload);
    expect(json.schema_version).toBe("1.4");

    expect(json.serie_dre_mensal.ultimo_mes_com_dados).toBe("2026-01");
    expect(json.serie_dre_mensal.qtd_meses_sem_dados).toBe(11);

    expect(json.indicadores_derivados.indicadores_contexto.confianca_baixa_ciclo).toBe(true);
    expect(json.indicadores_derivados.indicadores_contexto.notas_confianca_baixa_ciclo.length).toBe(1);

    expect(json.margem_liquida_por_cliente_estimada.top_clientes[0].lucro_liquido_estimado).toBe(34);
    // metas (se presente)
    expect(json.metas.receita_meta).toBe(15000);
  });
});

