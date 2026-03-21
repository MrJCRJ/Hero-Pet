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
  ws.addRow([]);
  ws.addRow(["Valor em estoque (custo)", fmt(data.fluxo.valorEstoque ?? 0)]);
  ws.addRow(["Valor presumido de venda do estoque", fmt(data.fluxo.valorPresumidoVendaEstoque ?? 0)]);
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
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Margem");
  const totalRec = data.totalReceita ?? data.itens.reduce((s, r) => s + Number(r.receita || 0), 0);
  ws.addRow([`Margem por Produto — ${periodoLabel(data.periodo.mes, data.periodo.ano)}`]).font = { bold: true };
  ws.addRow([`Total vendas: ${fmt(totalRec)}`]);
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
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Ranking");
  const titulo = data.tipo === "vendas" ? "Ranking de Vendas (clientes)" : "Ranking de Fornecedores";
  ws.addRow([`${titulo} — ${periodoLabel(data.periodo.mes, data.periodo.ano)}`]).font = { bold: true };
  if (data.tipo === "vendas" && data.totalGeral != null) {
    ws.addRow([`Total vendas do período: ${fmt(data.totalGeral)}`]);
    if (data.ticketMedioGeral != null) ws.addRow([`Ticket médio geral: ${fmt(data.ticketMedioGeral)}`]);
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
      ws.addRow([
        i + 1,
        r.nome,
        Number(r.pedidos_count || 0),
        total,
        pct,
        Number(r.ticketMedio ?? 0),
        Number(r.margemBruta ?? 0),
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
