import ExcelJS from "exceljs";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function periodoLabel(mes: number, ano: number): string {
  if (ano === 0) return "Últimos 12 meses";
  if (mes === 0 || !mes) return `Ano ${ano} (todos os meses)`;
  return `${MESES[mes - 1]} de ${ano}`;
}

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export async function gerarDREExcel(data: {
  periodo: { mes: number; ano: number };
  dre: Record<string, number>;
  dreAnterior?: Record<string, number> | null;
  indicadores?: { pmr: number | null; pmp: number | null; giroEstoque: number | null; dve: number | null } | null;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("DRE");
  ws.addRow([`DRE — Demonstração do Resultado — ${periodoLabel(data.periodo.mes, data.periodo.ano)}`]).font = { bold: true };
  ws.addRow([]);
  const d = data.dre;
  ws.addRow(["Receita bruta", fmt((d.receitaBruta ?? d.receitas) || 0)]);
  ws.addRow(["Receita líquida", fmt((d.receitaLiquida ?? d.receitas) || 0)]);
  ws.addRow(["(-) Custos (COGS)", `-${fmt(d.custosVendas || 0)}`]);
  ws.addRow(["Lucro bruto", `${fmt(d.lucroBruto || 0)} (${d.margemBruta || 0}%)`]).font = { bold: true };
  ws.addRow(["(-) Despesas operacionais", `-${fmt(d.despesas || 0)}`]);
  ws.addRow(["Lucro operacional (EBIT)", `${fmt(d.lucroOperacional || 0)} (${d.margemOperacional || 0}%)`]).font = { bold: true };
  if (d.ebitda != null) ws.addRow(["EBITDA", `${fmt(d.ebitda)} (${d.margemEbitda ?? 0}%)`]);
  ws.addRow([]);
  ws.addRow(["Indicadores de eficiência"]).font = { bold: true };
  ws.addRow(["Custos / Receita", `${d.custosSobreReceita ?? 0}%`]);
  ws.addRow(["Despesas / Receita", `${d.despesasSobreReceita ?? 0}%`]);
  const ind = data.indicadores;
  if (ind) {
    ws.addRow([]);
    ws.addRow(["Indicadores gerenciais"]).font = { bold: true };
    ws.addRow(["PMR (dias)", ind.pmr != null ? ind.pmr : "N/D"]);
    ws.addRow(["PMP (dias)", ind.pmp != null ? ind.pmp : "N/D"]);
    ws.addRow(["Giro estoque", ind.giroEstoque != null ? ind.giroEstoque : "N/D"]);
    ws.addRow(["DVE (dias)", ind.dve != null ? ind.dve : "N/D"]);
  }
  const dreAnt = data.dreAnterior;
  if (dreAnt && dreAnt.receitas > 0) {
    ws.addRow([]);
    ws.addRow(["Comparação mês anterior"]).font = { bold: true };
    const rec = d.receitas || 0;
    const varRec = ((rec - dreAnt.receitas) / dreAnt.receitas) * 100;
    ws.addRow(["Variação receitas", `${varRec >= 0 ? "+" : ""}${Number(varRec).toFixed(1)}%`]);
    ws.addRow(["Receitas anterior", fmt(dreAnt.receitas)]);
    ws.addRow(["Lucro oper. anterior", fmt(dreAnt.lucroOperacional)]);
  }
  ws.getColumn(2).width = 22;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function gerarFluxoCaixaExcel(data: {
  periodo: { mes: number; ano: number };
  fluxo: {
    saldoInicial?: number;
    saldoFinal?: number;
    entradas: Record<string, number>;
    saidas: Record<string, number>;
    saldo: number;
    fluxoOperacional?: number;
    fluxoFinanciamento?: number;
    fluxoInvestimento?: number;
    valorEstoque?: number;
    valorPresumidoVendaEstoque?: number;
    evolucaoMensal?: Array<{ mes: string; entradas: number; saidas: number; saldoPeriodo: number; saldoAcumulado: number }>;
    conciliacao?: { lucroOperacional: number; variacaoContasReceber: number; variacaoEstoque: number };
    fluxoAnterior?: { saldo: number; entradas: number; saidas: number };
    indicadores?: { pmr: number | null; pmp: number | null; giroEstoque: number | null; dve: number | null };
  };
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Fluxo de Caixa");
  ws.addRow([`Fluxo de Caixa — ${periodoLabel(data.periodo.mes, data.periodo.ano)}`]).font = { bold: true };
  ws.addRow([]);
  if (data.fluxo.saldoInicial != null) {
    ws.addRow(["Saldo inicial", fmt(data.fluxo.saldoInicial)]).font = { bold: true };
    ws.addRow([]);
  }
  const e = data.fluxo.entradas;
  const s = data.fluxo.saidas;
  ws.addRow(["Entradas"]);
  ws.addRow(["Vendas", fmt(e?.vendas || 0)]);
  ws.addRow(["Promissórias recebidas", fmt(e?.promissoriasRecebidas || 0)]);
  if ((e?.aportesCapital ?? 0) > 0) {
    ws.addRow(["Aportes de capital", fmt(e?.aportesCapital || 0)]);
  }
  ws.addRow(["Total entradas", fmt(e?.total || 0)]).font = { bold: true };
  ws.addRow([]);
  ws.addRow(["Saídas"]);
  ws.addRow(["Compras", fmt(s?.compras || 0)]);
  ws.addRow(["Despesas", fmt(s?.despesas || 0)]);
  ws.addRow(["Total saídas", fmt(s?.total || 0)]).font = { bold: true };
  ws.addRow([]);
  ws.addRow(["Saldo do período", fmt(data.fluxo.saldo)]).font = { bold: true };
  if (data.fluxo.saldoFinal != null) {
    ws.addRow(["Saldo final", fmt(data.fluxo.saldoFinal)]).font = { bold: true };
  }
  if (data.fluxo.fluxoOperacional != null || data.fluxo.fluxoFinanciamento != null) {
    ws.addRow([]);
    ws.addRow(["Fluxos por natureza"]);
    if (data.fluxo.fluxoOperacional != null) ws.addRow(["Operacional", fmt(data.fluxo.fluxoOperacional)]);
    if (data.fluxo.fluxoFinanciamento != null) ws.addRow(["Financiamento", fmt(data.fluxo.fluxoFinanciamento)]);
    if ((data.fluxo.fluxoInvestimento ?? 0) !== 0) ws.addRow(["Investimento", fmt(data.fluxo.fluxoInvestimento ?? 0)]);
  }
  if (data.fluxo.conciliacao) {
    const c = data.fluxo.conciliacao;
    ws.addRow([]);
    ws.addRow(["Conciliação: Lucro Operacional x Fluxo de Caixa"]).font = { bold: true };
    ws.addRow(["Lucro operacional (EBIT)", fmt(c.lucroOperacional)]);
    ws.addRow(["(+) Variação contas a receber", fmt(c.variacaoContasReceber)]);
    ws.addRow(["(-) Variação estoque", fmt(c.variacaoEstoque)]);
    ws.addRow(["= Fluxo de caixa operacional", fmt(data.fluxo.fluxoOperacional ?? 0)]).font = { bold: true };
  }
  ws.addRow([]);
  ws.addRow(["Valor em estoque (custo)", fmt(data.fluxo.valorEstoque ?? 0)]);
  ws.addRow(["Valor presumido de venda do estoque", fmt(data.fluxo.valorPresumidoVendaEstoque ?? 0)]);
  const ind = data.fluxo.indicadores;
  if (ind) {
    ws.addRow([]);
    ws.addRow(["Indicadores gerenciais"]).font = { bold: true };
    ws.addRow(["PMR (dias)", ind.pmr != null ? ind.pmr : "N/D"]);
    ws.addRow(["PMP (dias)", ind.pmp != null ? ind.pmp : "N/D"]);
    ws.addRow(["Giro estoque", ind.giroEstoque != null ? ind.giroEstoque : "N/D"]);
    ws.addRow(["DVE (dias)", ind.dve != null ? ind.dve : "N/D"]);
  }
  const fluxoAnt = data.fluxo.fluxoAnterior;
  if (fluxoAnt) {
    ws.addRow([]);
    ws.addRow(["Comparação ano anterior"]).font = { bold: true };
    ws.addRow(["Fluxo oper. anterior", fmt(fluxoAnt.saldo)]);
    const fluxoOp = data.fluxo.fluxoOperacional ?? 0;
    ws.addRow(["Variação", fmt(fluxoOp - fluxoAnt.saldo)]);
  }
  if (data.fluxo.evolucaoMensal && data.fluxo.evolucaoMensal.length > 0) {
    ws.addRow([]);
    ws.addRow(["Evolução mensal", "Entradas", "Saídas", "Saldo período", "Saldo acumulado"]).font = { bold: true };
    for (const r of data.fluxo.evolucaoMensal) {
      ws.addRow([r.mes, r.entradas, r.saidas, r.saldoPeriodo, r.saldoAcumulado]);
    }
  }
  ws.getColumn(2).width = 18;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function gerarMargemExcel(data: {
  periodo: { mes: number; ano: number };
  itens: Array<Record<string, unknown>>;
  totalReceita?: number;
  margemAnterior?: { totalReceita: number; lucroTotal: number } | null;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Margem");
  const totalRec = data.totalReceita ?? data.itens.reduce((s, r) => s + Number(r.receita || 0), 0);
  ws.addRow([`Margem por Produto — ${periodoLabel(data.periodo.mes, data.periodo.ano)}`]).font = { bold: true };
  ws.addRow([`Total vendas: ${fmt(totalRec)}`]);
  const margAnt = data.margemAnterior;
  if (margAnt && margAnt.totalReceita > 0) {
    const cresc = ((totalRec - margAnt.totalReceita) / margAnt.totalReceita) * 100;
    ws.addRow([`Crescimento vendas vs ano anterior: ${cresc >= 0 ? "+" : ""}${Number(cresc).toFixed(1)}% (anterior: ${fmt(margAnt.totalReceita)})`]);
  }
  ws.addRow([]);
  ws.addRow(["Produto", "Categoria", "Receita", "% Vendas", "Custos", "Lucro", "Margem %", "Marg. unit."]).font = { bold: true };
  for (const r of data.itens) {
    const rec = Number(r.receita || 0);
    const qty = Number(r.quantidade || 1);
    ws.addRow([
      r.nome,
      r.categoria || "-",
      rec,
      totalRec > 0 ? ((rec / totalRec) * 100).toFixed(1) + "%" : "0%",
      Number(r.cogs || 0),
      Number(r.lucro || 0),
      Number(r.margem || 0),
      qty > 0 ? (Number(r.lucro || 0) / qty).toFixed(2) : "-",
    ]);
  }
  ws.addRow([]);
  const totCogs = data.itens.reduce((s, r) => s + Number(r.cogs || 0), 0);
  const totLucro = data.itens.reduce((s, r) => s + Number(r.lucro || 0), 0);
  ws.addRow(["TOTAL", "", totalRec, "100%", totCogs, totLucro, totalRec > 0 ? ((totLucro / totalRec) * 100).toFixed(1) + "%" : "-", ""]).font = { bold: true };
  ws.getColumn(1).width = 30;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function gerarRankingExcel(data: {
  periodo: { mes: number; ano: number };
  tipo: string;
  ranking: Array<Record<string, unknown>>;
  totalGeral?: number;
  totalPedidosGeral?: number;
  ticketMedioGeral?: number;
  rankingAnterior?: { totalGeral: number } | null;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Ranking");
  const titulo = data.tipo === "vendas" ? "Ranking de Vendas (clientes)" : "Ranking de Fornecedores";
  ws.addRow([`${titulo} — ${periodoLabel(data.periodo.mes, data.periodo.ano)}`]).font = { bold: true };
  if (data.tipo === "vendas" && data.totalGeral != null) {
    ws.addRow([`Total vendas do período: ${fmt(data.totalGeral)}`]);
    if (data.ticketMedioGeral != null) ws.addRow([`Ticket médio geral: ${fmt(data.ticketMedioGeral)}`]);
    const totalTop10 = data.ranking.slice(0, 10).reduce((s, r) => s + Number(r.total || 0), 0);
    const pctTop10 = data.totalGeral > 0 ? ((totalTop10 / data.totalGeral) * 100).toFixed(1) : "0";
    ws.addRow([`Top 10 representam ${pctTop10}% do total (${fmt(totalTop10)})`]);
    const rankAnt = data.rankingAnterior;
    if (rankAnt && rankAnt.totalGeral > 0) {
      const cresc = ((data.totalGeral - rankAnt.totalGeral) / rankAnt.totalGeral) * 100;
      ws.addRow([`Crescimento vs ano anterior: ${cresc >= 0 ? "+" : ""}${Number(cresc).toFixed(1)}% (anterior: ${fmt(rankAnt.totalGeral)})`]);
    }
  }
  ws.addRow([]);
  const headers = data.tipo === "vendas"
    ? ["#", "Nome", "Pedidos", "Total", "% Total", "Ticket médio", "Margem %"]
    : ["#", "Nome", "Pedidos", "Total"];
  ws.addRow(headers).font = { bold: true };
  data.ranking.forEach((r, i) => {
    if (data.tipo === "vendas") {
      const total = Number(r.total || 0);
      const pct = data.totalGeral && data.totalGeral > 0 ? ((total / data.totalGeral) * 100).toFixed(1) : "-";
      const margemVal = r.margemBruta != null ? Number(r.margemBruta) : "N/D";
      ws.addRow([
        i + 1,
        r.nome,
        Number(r.pedidos_count || 0),
        total,
        pct,
        Number(r.ticketMedio ?? 0),
        margemVal,
      ]);
    } else {
      ws.addRow([i + 1, r.nome, Number(r.pedidos_count || 0), Number(r.total || 0)]);
    }
  });
  if (data.tipo === "vendas" && data.totalGeral != null) {
    ws.addRow([]);
    ws.addRow(["", "TOTAL GERAL", data.totalPedidosGeral ?? 0, data.totalGeral, "100%", data.ticketMedioGeral ?? "-", ""]).font = { bold: true };
  }
  ws.getColumn(2).width = 35;
  return Buffer.from(await wb.xlsx.writeBuffer());
}
