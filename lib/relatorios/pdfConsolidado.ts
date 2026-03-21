/**
 * Geração do PDF consolidado (relatório unificado).
 */
import PDFDocument from "pdfkit";
import type { ApiResLike } from "@/server/api/v1/types";
import { periodoFilename } from "@/lib/relatorios/dateBounds";
import { fmt, getDataGeracao, writeCabecalhoPeriodo } from "@/lib/relatorios/pdfUtils";

export type PayloadConsolidadoPDF = {
  periodo: { mes: number; ano: number; firstDay?: string; lastDay?: string };
  dre: Record<string, number>;
  dreAnterior?: { receitas: number; lucroOperacional: number; margemBruta: number };
  fluxo: {
    saldoInicial?: number;
    saldoFinal?: number;
    entradas: Record<string, number>;
    saidas: Record<string, number>;
    saldo: number;
    fluxoOperacional?: number;
    evolucaoMensal?: Array<{ mes: string; entradas: number; saidas: number; saldoPeriodo: number; saldoAcumulado: number }>;
  };
  indicadores?: { pmr: number | null; pmp: number | null; giroEstoque: number | null; dve: number | null } | null;
  margem: { itens: Array<Record<string, unknown>>; totalReceita: number; margemMediaPonderada?: number };
  ranking: { itens: Array<Record<string, unknown>>; totalGeral: number };
  alertas?: Array<{ id: string; tipo: string; msg: string; valorAtual?: string | number; referencia?: string; acaoSugerida?: string }>;
  cenarioLiquidacao?: {
    saldoCaixaAtual: number;
    valorPresumidoVendaBruto: number;
    comissaoPct: number;
    comissaoValor: number;
    vendaLiquidaEstoque: number;
    promissoriasAReceber: number;
    disponivelTotal: number;
    saldoDevolverSocios: number;
    resultadoFinal: number;
    erro?: string;
  };
};

export function gerarConsolidadoPDF(
  data: PayloadConsolidadoPDF,
  // eslint-disable-next-line no-unused-vars -- params são parte da assinatura
  res: ApiResLike & { setHeader: (key: string, val: string) => void }
): void {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Relatorio-Consolidado-${periodoFilename(data.periodo.mes, data.periodo.ano)}.pdf"`
  );
  const doc = new PDFDocument({ margin: 50 }) as InstanceType<typeof PDFDocument>;
  doc.pipe(res as unknown as import("stream").Writable);

  doc.fontSize(18).font("Helvetica-Bold").text("Relatório Consolidado", { align: "center" });
  doc.moveDown(0.5);
  writeCabecalhoPeriodo(doc, data.periodo);

  const ind = data.indicadores;
  const d = data.dre;
  const fluxo = data.fluxo;

  doc.fontSize(14).font("Helvetica-Bold").text("1. Resumo executivo", { continued: false });
  doc.fontSize(10).font("Helvetica");
  doc.text(`Saldo final de caixa: ${fmt(fluxo.saldoFinal ?? 0)}`, { indent: 10 });
  doc.text(`Fluxo operacional: ${fmt(fluxo.fluxoOperacional ?? 0)}`, { indent: 10 });
  doc.text(`Margem bruta: ${d.margemBruta ?? 0}%`, { indent: 10 });
  doc.text(`Lucro operacional: ${fmt(d.lucroOperacional ?? 0)}`, { indent: 10 });
  const dreAnt = data.dreAnterior;
  if (dreAnt && dreAnt.receitas > 0) {
    const varRec = ((d.receitas - dreAnt.receitas) / dreAnt.receitas) * 100;
    doc.text(`Variação receitas vs período ant.: ${varRec >= 0 ? "+" : ""}${Number(varRec).toFixed(1)}%`, { indent: 10 });
    const varMargem = d.margemBruta - dreAnt.margemBruta;
    doc.text(`Variação margem bruta: ${varMargem >= 0 ? "+" : ""}${Number(varMargem).toFixed(1)} p.p.`, { indent: 10 });
  }
  if (ind) {
    doc.text(`PMR: ${ind.pmr != null ? `${ind.pmr} dias` : "N/D"} | PMP: ${ind.pmp != null ? `${ind.pmp} dias` : "N/D"} | DVE: ${ind.dve != null ? `${ind.dve} dias` : "N/D"}`, { indent: 10 });
  }
  doc.moveDown(0.5);
  const alertas = data.alertas ?? [];
  if (alertas.length > 0) {
    doc.font("Helvetica-Bold").text("Alertas:");
    doc.font("Helvetica");
    for (const a of alertas) {
      const icone = a.tipo === "erro" ? "[X]" : "[!]";
      doc.text(`${icone} ${a.msg}`, { indent: 15 });
      if (a.valorAtual != null) doc.text(`  Valor: ${String(a.valorAtual)}`, { indent: 20 });
      if (a.acaoSugerida) doc.text(`  Ação: ${a.acaoSugerida}`, { indent: 20 });
    }
  } else {
    doc.font("Helvetica").text("Nenhum alerta no período.", { indent: 10 });
  }
  doc.moveDown(1);

  const cenario = data.cenarioLiquidacao;
  if (doc.y > doc.page.height - 200) doc.addPage();
  doc.fontSize(14).font("Helvetica-Bold").text("2. Cenário de Liquidação", { continued: false });
  doc.fontSize(10).font("Helvetica");
  if (cenario?.erro) {
    doc.text(`Cálculo parcial ou indisponível: ${cenario.erro}`, { indent: 10 });
  } else if (cenario) {
    doc.text(`Saldo de caixa atual: ${fmt(cenario.saldoCaixaAtual)}`, { indent: 10 });
    doc.text(`Valor de venda do estoque (bruto): ${fmt(cenario.valorPresumidoVendaBruto)}`, { indent: 10 });
    doc.text(`Comissão (${cenario.comissaoPct}%): -${fmt(cenario.comissaoValor)}`, { indent: 10 });
    doc.text(`Venda líquida do estoque: ${fmt(cenario.vendaLiquidaEstoque)}`, { indent: 10 });
    doc.text(`Promissórias a receber: ${fmt(cenario.promissoriasAReceber)}`, { indent: 10 });
    doc.font("Helvetica-Bold").text(`Total disponível: ${fmt(cenario.disponivelTotal)}`, { indent: 10 });
    doc.font("Helvetica").text(`Saldo a devolver aos sócios: -${fmt(cenario.saldoDevolverSocios)}`, { indent: 10 });
    doc.font("Helvetica-Bold").text(`Resultado final: ${fmt(cenario.resultadoFinal)}`, { indent: 10 });
  } else {
    doc.text("Dados do cenário de liquidação não disponíveis.", { indent: 10 });
  }
  doc.moveDown(1);

  if (doc.y > doc.page.height - 180) doc.addPage();
  doc.fontSize(14).font("Helvetica-Bold").text("3. DRE e Fluxo de Caixa", { continued: false });
  doc.fontSize(10).font("Helvetica");
  doc.text(`Receitas: ${fmt(d.receitas ?? 0)} | Lucro bruto: ${fmt(d.lucroBruto ?? 0)} (${d.margemBruta ?? 0}%)`, { indent: 10 });
  doc.text(`Despesas: -${fmt(d.despesas ?? 0)} | Lucro operacional: ${fmt(d.lucroOperacional ?? 0)}`, { indent: 10 });
  doc.text(`Entradas: ${fmt(fluxo.entradas?.total ?? 0)} | Saídas: ${fmt(fluxo.saidas?.total ?? 0)} | Saldo período: ${fmt(fluxo.saldo ?? 0)}`, { indent: 10 });
  doc.text(`Saldo final: ${fmt(fluxo.saldoFinal ?? 0)}`, { indent: 10 });
  doc.moveDown(1);

  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.fontSize(14).font("Helvetica-Bold").text("4. Top produtos (margem)", { continued: false });
  doc.fontSize(9).font("Helvetica");
  const itensMargem = (data.margem?.itens ?? []).slice(0, 15);
  const totalRec = data.margem?.totalReceita ?? 0;
  if (itensMargem.length > 0) {
    const colW = [150, 70, 55, 70, 55];
    const startX = 50;
    doc.font("Helvetica-Bold");
    doc.text("Produto", startX, doc.y);
    doc.text("Receita", startX + colW[0], doc.y);
    doc.text("% Vend.", startX + colW[0] + colW[1], doc.y);
    doc.text("Custos", startX + colW[0] + colW[1] + colW[2], doc.y);
    doc.text("Marg.%", startX + colW[0] + colW[1] + colW[2] + colW[3], doc.y);
    doc.moveDown(0.4);
    doc.moveTo(startX, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.2);
    doc.font("Helvetica");
    const rowHeight = 14;
    for (const r of itensMargem) {
      if (doc.y > doc.page.height - 70) doc.addPage();
      const rowY = doc.y;
      const rec = Number(r.receita || 0);
      const pct = totalRec > 0 ? ((rec / totalRec) * 100).toFixed(1) : "0";
      const margemStr = r.margem != null ? `${Number(r.margem).toFixed(1)}%` : "-";
      doc.text(String(r.nome ?? "-").slice(0, 28), startX, rowY, { width: colW[0] });
      doc.text(fmt(rec), startX + colW[0], rowY, { width: colW[1] });
      doc.text(`${pct}%`, startX + colW[0] + colW[1], rowY, { width: colW[2] });
      doc.text(fmt(Number(r.cogs || 0)), startX + colW[0] + colW[1] + colW[2], rowY, { width: colW[3] });
      doc.text(margemStr, startX + colW[0] + colW[1] + colW[2] + colW[3], rowY, { width: colW[4] });
      doc.y = rowY + rowHeight;
    }
  }
  doc.moveDown(1);

  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.fontSize(14).font("Helvetica-Bold").text("5. Top clientes", { continued: false });
  doc.fontSize(9).font("Helvetica");
  const itensRanking = (data.ranking?.itens ?? []).slice(0, 20);
  const totalGeral = data.ranking?.totalGeral ?? 0;
  if (itensRanking.length > 0) {
    const colX = [50, 200, 300, 370];
    doc.text("Cliente", colX[0], doc.y);
    doc.text("Total", colX[1], doc.y);
    doc.text("% Total", colX[2], doc.y);
    doc.text("Marg.%", colX[3], doc.y);
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.2);
    for (const r of itensRanking) {
      if (doc.y > doc.page.height - 70) doc.addPage();
      const total = Number(r.total || 0);
      const pct = totalGeral > 0 ? ((total / totalGeral) * 100).toFixed(1) : "-";
      const margemStr = r.margemBruta != null ? `${Number(r.margemBruta).toFixed(1)}%` : "N/D";
      doc.text(String(r.nome ?? "-").slice(0, 35), colX[0], doc.y, { width: 145 });
      doc.text(fmt(total), colX[1], doc.y, { width: 95 });
      doc.text(`${pct}%`, colX[2], doc.y, { width: 65 });
      doc.text(margemStr, colX[3], doc.y, { width: 55 });
      doc.y += 14;
    }
  }
  doc.moveDown(1);

  const evolucao = fluxo.evolucaoMensal ?? [];
  if (evolucao.length > 0) {
    if (doc.y > doc.page.height - 100) doc.addPage();
    doc.fontSize(14).font("Helvetica-Bold").text("6. Evolução mensal", { continued: false });
    doc.fontSize(8).font("Helvetica");
    const evColX = [50, 115, 180, 255, 330];
    doc.text("Mês", evColX[0], doc.y);
    doc.text("Entradas", evColX[1], doc.y);
    doc.text("Saídas", evColX[2], doc.y);
    doc.text("Saldo período", evColX[3], doc.y);
    doc.text("Saldo acum.", evColX[4], doc.y);
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.2);
    for (const r of evolucao) {
      if (doc.y > doc.page.height - 70) doc.addPage();
      const rowY = doc.y;
      doc.text(String(r.mes), evColX[0], rowY, { width: 60 });
      doc.text(fmt(r.entradas), evColX[1], rowY, { width: 60 });
      doc.text(fmt(r.saidas), evColX[2], rowY, { width: 70 });
      doc.text(fmt(r.saldoPeriodo), evColX[3], rowY, { width: 70 });
      doc.text(fmt(r.saldoAcumulado), evColX[4], rowY, { width: 80 });
      doc.y = rowY + 12;
    }
  }

  doc.moveDown(0.5);
  doc.fontSize(9).fillColor("#555555");
  doc.text(`Gerado em: ${getDataGeracao()}`, { align: "center" });
  doc.fillColor("#000000");
  doc.end();
}
