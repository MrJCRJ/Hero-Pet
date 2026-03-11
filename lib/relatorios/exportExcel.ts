import ExcelJS from "exceljs";

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
  const mesNome = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ][data.periodo.mes - 1];
  ws.addRow([`DRE — ${mesNome} de ${data.periodo.ano}`]).font = { bold: true };
  ws.addRow([]);
  const d = data.dre;
  ws.addRow(["Receitas (vendas)", fmt(d.receitas || 0)]);
  ws.addRow(["(-) Custos (COGS)", `-${fmt(d.custosVendas || 0)}`]);
  ws.addRow(["Lucro bruto", `${fmt(d.lucroBruto || 0)} (${d.margemBruta || 0}%)`]).font = { bold: true };
  ws.addRow(["(-) Despesas", `-${fmt(d.despesas || 0)}`]);
  ws.addRow(["Lucro operacional", `${fmt(d.lucroOperacional || 0)} (${d.margemOperacional || 0}%)`]).font = { bold: true };
  ws.getColumn(2).width = 18;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function gerarFluxoCaixaExcel(data: {
  periodo: { mes: number; ano: number };
  fluxo: { entradas: Record<string, number>; saidas: Record<string, number>; saldo: number };
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Fluxo de Caixa");
  const mesNome = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ][data.periodo.mes - 1];
  ws.addRow([`Fluxo de Caixa — ${mesNome} de ${data.periodo.ano}`]).font = { bold: true };
  ws.addRow([]);
  const e = data.fluxo.entradas;
  const s = data.fluxo.saidas;
  ws.addRow(["Entradas"]);
  ws.addRow(["Vendas", fmt(e?.vendas || 0)]);
  ws.addRow(["Promissórias recebidas", fmt(e?.promissoriasRecebidas || 0)]);
  ws.addRow(["Total entradas", fmt(e?.total || 0)]).font = { bold: true };
  ws.addRow([]);
  ws.addRow(["Saídas"]);
  ws.addRow(["Compras", fmt(s?.compras || 0)]);
  ws.addRow(["Despesas", fmt(s?.despesas || 0)]);
  ws.addRow(["Total saídas", fmt(s?.total || 0)]).font = { bold: true };
  ws.addRow([]);
  ws.addRow(["Saldo do período", fmt(data.fluxo.saldo)]).font = { bold: true };
  ws.getColumn(2).width = 18;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function gerarMargemExcel(data: {
  periodo: { mes: number; ano: number };
  itens: Array<Record<string, unknown>>;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Margem");
  const mesNome = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ][data.periodo.mes - 1];
  ws.addRow([`Margem por Produto — ${mesNome} de ${data.periodo.ano}`]).font = { bold: true };
  ws.addRow([]);
  ws.addRow(["Produto", "Categoria", "Receita", "Custos", "Lucro", "Margem %"]).font = { bold: true };
  for (const r of data.itens) {
    ws.addRow([
      r.nome,
      r.categoria || "-",
      Number(r.receita || 0),
      Number(r.cogs || 0),
      Number(r.lucro || 0),
      Number(r.margem || 0),
    ]);
  }
  ws.getColumn(1).width = 30;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function gerarRankingExcel(data: {
  periodo: { mes: number; ano: number };
  tipo: string;
  ranking: Array<Record<string, unknown>>;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Ranking");
  const mesNome = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ][data.periodo.mes - 1];
  const titulo = data.tipo === "vendas" ? "Ranking de Vendas (clientes)" : "Ranking de Fornecedores";
  ws.addRow([`${titulo} — ${mesNome} de ${data.periodo.ano}`]).font = { bold: true };
  ws.addRow([]);
  ws.addRow(["#", "Nome", "Pedidos", "Total"]).font = { bold: true };
  data.ranking.forEach((r, i) => {
    ws.addRow([i + 1, r.nome, Number(r.pedidos_count || 0), Number(r.total || 0)]);
  });
  ws.getColumn(2).width = 35;
  return Buffer.from(await wb.xlsx.writeBuffer());
}
