export interface Alerta {
  id: string;
  tipo: "erro" | "aviso";
  msg: string;
  valorAtual?: string | number;
  referencia?: string;
  acaoSugerida?: string;
}

export interface DadosParaAlertas {
  dre?: {
    receitas: number;
    lucroBruto: number;
    lucroOperacional: number;
    despesas: number;
    margemBruta: number;
    margemOperacional: number;
  };
  fluxo?: {
    saldoFinal: number;
    fluxoOperacional: number;
    evolucaoMensal?: Array<{
      mes: string;
      entradas: number;
      saidas: number;
      saldoPeriodo: number;
      saldoAcumulado: number;
    }>;
  };
  indicadores?: {
    pmr: number | null;
    pmp: number | null;
    dve: number | null;
  };
  margem?: {
    itens: Array<{
      produto_id?: string | number;
      nome: string;
      receita: number;
      margem: number;
      participacaoVendas?: number;
    }>;
    totalReceita: number;
    margemMediaPonderada?: number;
  };
  ranking?: {
    itens: Array<{
      entity_id?: string | number;
      nome: string;
      total?: number;
      margemBruta: number | null;
    }>;
    totalGeral: number;
  };
}

function fmt(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export function computeAlertas(dados: DadosParaAlertas): Alerta[] {
  const alertas: Alerta[] = [];

  // 1. Fluxo operacional negativo prolongado (3+ meses consecutivos)
  const evolucao = dados.fluxo?.evolucaoMensal ?? [];
  if (evolucao.length >= 3) {
    let mesesNegativosConsecutivos = 0;
    for (let i = evolucao.length - 1; i >= 0; i--) {
      if (evolucao[i].saldoPeriodo < 0) {
        mesesNegativosConsecutivos++;
      } else {
        break;
      }
    }
    if (mesesNegativosConsecutivos >= 3) {
      alertas.push({
        id: "fluxo-negativo-prolongado",
        tipo: "erro",
        msg: `Fluxo operacional negativo há ${mesesNegativosConsecutivos} meses consecutivos.`,
        valorAtual: fmt(dados.fluxo?.fluxoOperacional ?? 0),
        referencia: "Fluxo acumulado negativo desde o período indicado",
        acaoSugerida: "Revisar prazos de recebimento e reduzir estoques",
      });
    }
  }

  // 2. Saldo de caixa baixo (saldoFinal < 15 dias de despesas ≈ despesas * 0.5)
  const despesasMensais = dados.dre?.despesas ?? 0;
  const saldoFinal = dados.fluxo?.saldoFinal ?? 0;
  const minimoCaixa = despesasMensais * 0.5;
  if (despesasMensais > 0 && saldoFinal < minimoCaixa && saldoFinal >= 0) {
    alertas.push({
      id: "saldo-caixa-baixo",
      tipo: "aviso",
      msg: "Saldo de caixa abaixo do equivalente a 15 dias de despesas.",
      valorAtual: fmt(saldoFinal),
      referencia: `Mínimo sugerido: ${fmt(minimoCaixa)} (15 dias de despesas)`,
      acaoSugerida: "Antecipar recebíveis ou ajustar desembolsos",
    });
  } else if (saldoFinal < 0) {
    alertas.push({
      id: "saldo-caixa-negativo",
      tipo: "erro",
      msg: "Saldo de caixa negativo.",
      valorAtual: fmt(saldoFinal),
      acaoSugerida: "Urgente: revisar fluxo e capital de giro",
    });
  }

  // 3. PMR muito superior ao PMP (pmr - pmp > 30 dias)
  const pmr = dados.indicadores?.pmr ?? null;
  const pmp = dados.indicadores?.pmp ?? null;
  if (pmr != null && pmp != null && pmr - pmp > 30) {
    alertas.push({
      id: "pmr-superior-pmp",
      tipo: "aviso",
      msg: "PMR muito superior ao PMP — pressão sobre capital de giro.",
      valorAtual: `${pmr} dias vs ${pmp} dias (diferença: ${pmr - pmp} dias)`,
      referencia: "Limite sugerido: PMR - PMP ≤ 30 dias",
      acaoSugerida: "Negociar prazos com fornecedores ou antecipar recebíveis",
    });
  }

  // 4. DVE alto (> 60 dias)
  const dve = dados.indicadores?.dve ?? null;
  if (dve != null && dve > 60) {
    alertas.push({
      id: "dve-alto",
      tipo: "aviso",
      msg: "DVE (dias de venda em estoque) alto.",
      valorAtual: `${dve} dias`,
      referencia: "Meta: < 60 dias",
      acaoSugerida: "Reduzir compras, liquidar estoque lento",
    });
  }

  // 5. Produto com margem baixa e alta participação (participacao > 5% e margem < 15%)
  const itensMargem = dados.margem?.itens ?? [];
  const totalReceita = dados.margem?.totalReceita ?? 0;
  const margemMedia = dados.margem?.margemMediaPonderada;
  for (const item of itensMargem) {
    const participacao = item.participacaoVendas ?? (totalReceita > 0 ? (item.receita / totalReceita) * 100 : 0);
    const margem = item.margem ?? 0;
    if (participacao > 5 && margem < 15 && margem >= 0) {
      alertas.push({
        id: `produto-margem-baixa-${item.produto_id ?? item.nome?.slice(0, 20)}`,
        tipo: "aviso",
        msg: `Produto "${String(item.nome).slice(0, 30)}" com margem baixa e alta participação.`,
        valorAtual: `${margem.toFixed(1)}% (participação: ${participacao.toFixed(1)}%)`,
        referencia: margemMedia != null ? `Média empresa: ${margemMedia.toFixed(1)}%` : undefined,
        acaoSugerida: "Reavaliar preço ou descontinuar",
      });
    }
  }

  // 6. Cliente com margem muito baixa (no top 10 e margem < 15%)
  const rankingItens = dados.ranking?.itens ?? [];
  const top10 = rankingItens.slice(0, 10);
  const clientesComMargem = rankingItens.filter((c) => c.margemBruta != null && (c.total ?? 0) > 0);
  const totalVendasClientes = clientesComMargem.reduce((s, c) => s + (c.total ?? 0), 0);
  const lucroClientes = clientesComMargem.reduce(
    (s, c) => s + ((c.total ?? 0) * ((c.margemBruta ?? 0) / 100)),
    0
  );
  const margemMediaClientes =
    totalVendasClientes > 0 ? Number(((lucroClientes / totalVendasClientes) * 100).toFixed(1)) : null;

  for (let idx = 0; idx < top10.length; idx++) {
    const c = top10[idx];
    const margem = c.margemBruta;
    if (margem != null && margem < 15 && margem >= 0) {
      alertas.push({
        id: `cliente-margem-baixa-${c.entity_id ?? idx}`,
        tipo: "aviso",
        msg: `Cliente "${String(c.nome).slice(0, 30)}" com margem abaixo de 15%.`,
        valorAtual: `${margem.toFixed(1)}%`,
        acaoSugerida: "Verificar se compensa o volume; renegociar preço",
      });
    } else if (
      margem != null &&
      margemMediaClientes != null &&
      margem < margemMediaClientes - 2 &&
      margem >= 0
    ) {
      alertas.push({
        id: `cliente-margem-abaixo-media-${c.entity_id ?? idx}`,
        tipo: "aviso",
        msg: `Cliente "${String(c.nome).slice(0, 30)}" com margem abaixo da média da empresa.`,
        valorAtual: `${margem.toFixed(1)}% (média: ${margemMediaClientes}%)`,
        acaoSugerida: "Verificar precificação; renegociar se necessário",
      });
    }
  }

  // 7. Concentração clientes (top 10 > 50% do total)
  const totalGeral = dados.ranking?.totalGeral ?? 0;
  const totalTop10 = top10.reduce((s, c) => s + (c.total ?? 0), 0);
  const pctTop10 = totalGeral > 0 ? (totalTop10 / totalGeral) * 100 : 0;
  if (pctTop10 > 50) {
    alertas.push({
      id: "concentracao-clientes",
      tipo: "aviso",
      msg: "Alta concentração de clientes — top 10 representam mais de 50% da receita.",
      valorAtual: `${pctTop10.toFixed(1)}%`,
      referencia: "Risco alto de dependência",
      acaoSugerida: "Diversificar base, oferecer condições para clientes médios",
    });
  }

  // 8. Concentração produtos (top 1 produto > 20% do total)
  const topProduto = itensMargem[0];
  if (topProduto && totalReceita > 0) {
    const participacaoTop1 =
      topProduto.participacaoVendas ?? (topProduto.receita / totalReceita) * 100;
    if (participacaoTop1 > 20) {
      alertas.push({
        id: "concentracao-produtos",
        tipo: "aviso",
        msg: "Alta concentração em um único produto.",
        valorAtual: `${String(topProduto.nome).slice(0, 25)}: ${participacaoTop1.toFixed(1)}%`,
        referencia: "Meta: nenhum produto > 20% do total",
        acaoSugerida: "Diversificar mix de produtos",
      });
    }
  }

  return alertas;
}
