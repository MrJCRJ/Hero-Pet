import PDFDocument from "pdfkit";
import type { ApiResLike } from "@/server/api/v1/types";
import { periodoFilename } from "@/lib/relatorios/dateBounds";
import EMITENTE from "@/lib/constants/company";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function periodoLabel(mes: number, ano: number): string {
  if (ano === 0) return "Últimos 12 meses";
  if (mes === 0 || !mes) return `Ano ${ano} (todos os meses)`;
  return `${MESES[mes - 1]} de ${ano}`;
}

function mesSelecionadoLabel(mes: number): string {
  if (mes === 0 || !mes) return "Todos os meses";
  return MESES[mes - 1];
}

function anoSelecionadoLabel(ano: number): string {
  if (ano === 0) return "Últimos 12 meses";
  return String(ano);
}

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function formatDateBR(ymd: string): string {
  if (!ymd || typeof ymd !== "string") return "";
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

function getDataGeracao(): string {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function writeCabecalhoPeriodo(
  doc: InstanceType<typeof PDFDocument>,
  periodo: { mes: number; ano: number; firstDay?: string; lastDay?: string }
): void {
  doc.fontSize(10).font("Helvetica");
  doc.text(sanitizeForPdf(EMITENTE.razao), { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text(`Período: ${periodoLabel(periodo.mes, periodo.ano)}`, { align: "center" });
  doc.font("Helvetica");
  doc.fontSize(10);
  doc.text(`Mês: ${mesSelecionadoLabel(periodo.mes)} • Ano: ${anoSelecionadoLabel(periodo.ano)}`, { align: "center" });
  if (periodo.firstDay && periodo.lastDay) {
    const abrangencia = `${formatDateBR(periodo.firstDay)} a ${formatDateBR(periodo.lastDay)}`;
    doc.text(`Abrangência: ${abrangencia}`, { align: "center" });
    doc.fontSize(9).fillColor("#666666");
    doc.text("(Dados contabilizados entre as datas acima — data de emissão dos pedidos)", { align: "center" });
    doc.fillColor("#000000");
  }
  doc.fontSize(10);
  doc.text(`Gerado em: ${getDataGeracao()}`, { align: "center" });
  doc.moveDown(1);
}

/** Garante que o texto use apenas caracteres suportados (Latin-1) para evitar corrupção no PDF. */
function sanitizeForPdf(s: string): string {
  return s.replace(/[\u0100-\uFFFF]/g, "?");
}

export function gerarDREPDF(
  data: {
    periodo: { mes: number; ano: number; firstDay?: string; lastDay?: string };
    dre: Record<string, number>;
    dreAnterior?: Record<string, number> | null;
    indicadores?: { pmr: number | null; pmp: number | null; giroEstoque: number | null; dve: number | null } | null;
  },
  // eslint-disable-next-line no-unused-vars -- params são parte da assinatura
  res: ApiResLike & { setHeader: (key: string, val: string) => void }
): void {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="DRE-${periodoFilename(data.periodo.mes, data.periodo.ano)}.pdf"`
  );
  const doc = new PDFDocument({ margin: 50 }) as InstanceType<typeof PDFDocument>;
  doc.pipe(res as unknown as import("stream").Writable);
  doc.fontSize(18).font("Helvetica-Bold").text("DRE — Demonstração do Resultado", { align: "center" });
  doc.moveDown(0.5);
  writeCabecalhoPeriodo(doc, data.periodo);
  const d = data.dre;
  const receitas = d.receitas || 0;
  doc.fontSize(10).font("Helvetica");
  doc.text(`Receita bruta: ${fmt((d.receitaBruta ?? receitas) || 0)}`);
  doc.text(`Receita líquida: ${fmt((d.receitaLiquida ?? receitas) || 0)}`);
  doc.text(`(-) Custos (COGS): -${fmt(d.custosVendas || 0)}`, { indent: 20 });
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").text(`Lucro bruto: ${fmt(d.lucroBruto || 0)} (${d.margemBruta || 0}%)`);
  doc.font("Helvetica");
  doc.text(`(-) Despesas operacionais: -${fmt(d.despesas || 0)}`, { indent: 20 });
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").text(`Lucro operacional (EBIT): ${fmt(d.lucroOperacional || 0)} (${d.margemOperacional || 0}%)`);
  if (d.ebitda != null) {
    doc.font("Helvetica").text(`EBITDA: ${fmt(d.ebitda)} (${d.margemEbitda ?? 0}%)`, { indent: 20 });
  }
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").text("Indicadores de eficiência");
  doc.font("Helvetica");
  const custosPct = d.custosSobreReceita ?? (receitas > 0 ? ((d.custosVendas || 0) / receitas * 100) : 0);
  const despPct = d.despesasSobreReceita ?? (receitas > 0 ? ((d.despesas || 0) / receitas * 100) : 0);
  doc.text(`Custos / Receita: ${Number(custosPct).toFixed(1)}%`, { indent: 20 });
  doc.text(`Despesas / Receita: ${Number(despPct).toFixed(1)}%`, { indent: 20 });
  const ind = data.indicadores;
  if (ind) {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").text("Indicadores gerenciais");
    doc.font("Helvetica");
    doc.text(`PMR (prazo médio recebimento): ${ind.pmr != null ? `${ind.pmr} dias` : "N/D"}`, { indent: 20 });
    doc.text(`PMP (prazo médio pagamento): ${ind.pmp != null ? `${ind.pmp} dias` : "N/D"}`, { indent: 20 });
    doc.text(`Giro de estoque: ${ind.giroEstoque != null ? `${ind.giroEstoque}×/ano` : "N/D"}`, { indent: 20 });
    doc.text(`DVE (dias venda em estoque): ${ind.dve != null ? `${ind.dve} dias` : "N/D"}`, { indent: 20 });
  }
  const dreAnt = data.dreAnterior;
  if (dreAnt && dreAnt.receitas > 0) {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").text("Comparação com mês anterior");
    doc.font("Helvetica");
    const rec = d.receitas || 0;
    const lucOp = d.lucroOperacional || 0;
    const varReceita = ((rec - dreAnt.receitas) / dreAnt.receitas) * 100;
    doc.text(`Receitas: ${varReceita >= 0 ? "+" : ""}${Number(varReceita).toFixed(1)}% (anterior: ${fmt(dreAnt.receitas)})`, { indent: 20 });
    const varLucroOp = dreAnt.lucroOperacional !== 0 ? ((lucOp - dreAnt.lucroOperacional) / Math.abs(dreAnt.lucroOperacional)) * 100 : 0;
    doc.text(`Lucro operacional: ${varLucroOp >= 0 ? "+" : ""}${Number(varLucroOp).toFixed(1)}% (anterior: ${fmt(dreAnt.lucroOperacional)})`, { indent: 20 });
  }
  doc.moveDown(1);
  doc.fontSize(9).font("Helvetica").fillColor("#555555");
  doc.text("Glossário:", { continued: false });
  doc.text("• Receitas: total líquido + frete dos pedidos de venda confirmados no período.", { indent: 10 });
  doc.text("• COGS: custo dos produtos vendidos (método FIFO).", { indent: 10 });
  doc.text("• Despesas: despesas operacionais lançadas no período (data de vencimento).", { indent: 10 });
  doc.text("• Margem bruta: (lucro bruto / receitas) × 100. Margem operacional: (lucro operacional / receitas) × 100.", { indent: 10 });
  doc.fillColor("#000000");
  doc.end();
}

export function gerarFluxoCaixaPDF(
  data: {
    periodo: { mes: number; ano: number; firstDay?: string; lastDay?: string };
      fluxo: {
      saldoInicial?: number;
      saldoFinal?: number;
      entradas: Record<string, number>;
      saidas: Record<string, number>;
      saldo: number;
      fluxoOperacional?: number;
      fluxoFinanciamento?: number;
      valorEstoque?: number;
      valorPresumidoVendaEstoque?: number;
      evolucaoMensal?: Array<{ mes: string; entradas: number; saidas: number; saldoPeriodo: number; saldoAcumulado: number }>;
      conciliacao?: { lucroOperacional: number; variacaoContasReceber: number; variacaoEstoque: number; contasReceberInicial: number; contasReceberFinal: number };
      fluxoAnterior?: { saldo: number; entradas: number; saidas: number };
      indicadores?: { pmr: number | null; pmp: number | null; giroEstoque: number | null; dve: number | null };
    };
  },
  // eslint-disable-next-line no-unused-vars -- params são parte da assinatura
  res: ApiResLike & { setHeader: (key: string, val: string) => void }
): void {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Fluxo-Caixa-${periodoFilename(data.periodo.mes, data.periodo.ano)}.pdf"`
  );
  const doc = new PDFDocument({ margin: 50 }) as InstanceType<typeof PDFDocument>;
  doc.pipe(res as unknown as import("stream").Writable);
  doc.fontSize(18).font("Helvetica-Bold").text("Fluxo de Caixa", { align: "center" });
  doc.moveDown(0.5);
  writeCabecalhoPeriodo(doc, data.periodo);
  const e = data.fluxo.entradas;
  const s = data.fluxo.saidas;
  doc.fontSize(10).font("Helvetica-Bold").text("Entradas");
  doc.font("Helvetica");
  doc.text(`Vendas: ${fmt(e?.vendas || 0)}`, { indent: 20 });
  doc.text(`Promissórias recebidas: ${fmt(e?.promissoriasRecebidas || 0)}`, { indent: 20 });
  if ((e?.aportesCapital ?? 0) > 0) {
    doc.text(`Aportes de capital: ${fmt(e?.aportesCapital || 0)}`, { indent: 20 });
  }
  doc.text(`Total: ${fmt(e?.total || 0)}`, { indent: 20 });
  if (data.fluxo.saldoInicial != null) {
    doc.moveDown(0.3);
    doc.font("Helvetica").text(`Saldo inicial: ${fmt(data.fluxo.saldoInicial)}`, { indent: 20 });
  }
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").text("Saídas");
  doc.font("Helvetica");
  doc.text(`Compras: ${fmt(s?.compras || 0)}`, { indent: 20 });
  doc.text(`Despesas: ${fmt(s?.despesas || 0)}`, { indent: 20 });
  doc.text(`Total: ${fmt(s?.total || 0)}`, { indent: 20 });
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").text(`Saldo do período: ${fmt(data.fluxo.saldo)}`);
  if (data.fluxo.saldoFinal != null) {
    doc.font("Helvetica").text(`Saldo final: ${fmt(data.fluxo.saldoFinal)}`, { indent: 20 });
  }
  if (data.fluxo.fluxoOperacional != null || data.fluxo.fluxoFinanciamento != null) {
    doc.moveDown(0.3);
    doc.font("Helvetica").text(`Fluxo operacional: ${fmt(data.fluxo.fluxoOperacional ?? 0)} | Financiamento: ${fmt(data.fluxo.fluxoFinanciamento ?? 0)}`, { indent: 20 });
  }
  doc.moveDown(0.5);
  const ind = data.fluxo.indicadores;
  if (ind) {
    doc.font("Helvetica-Bold").text("Indicadores gerenciais");
    doc.font("Helvetica");
    doc.text(`PMR (prazo médio recebimento): ${ind.pmr != null ? `${ind.pmr} dias` : "N/D"}`, { indent: 20 });
    doc.text(`PMP (prazo médio pagamento): ${ind.pmp != null ? `${ind.pmp} dias` : "N/D"}`, { indent: 20 });
    doc.text(`Giro de estoque: ${ind.giroEstoque != null ? `${ind.giroEstoque}×/ano` : "N/D"}`, { indent: 20 });
    doc.text(`DVE (dias venda em estoque): ${ind.dve != null ? `${ind.dve} dias` : "N/D"}`, { indent: 20 });
    doc.moveDown(0.5);
  }
  const fluxoAnt = data.fluxo.fluxoAnterior;
  if (fluxoAnt) {
    doc.font("Helvetica-Bold").text("Comparação com ano anterior");
    doc.font("Helvetica");
    doc.text(`Fluxo operacional ano anterior: ${fmt(fluxoAnt.saldo)}`, { indent: 20 });
    const fluxoOp = data.fluxo.fluxoOperacional ?? 0;
    const variacao = fluxoOp - fluxoAnt.saldo;
    doc.text(`Variação: ${variacao >= 0 ? "+" : ""}${fmt(variacao)}`, { indent: 20 });
    doc.moveDown(0.5);
  }
  const valorEstoque = data.fluxo.valorEstoque ?? 0;
  const valorPresumidoVenda = data.fluxo.valorPresumidoVendaEstoque ?? 0;
  const conc = data.fluxo.conciliacao;
  if (conc) {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").text("Conciliação: Lucro Operacional x Fluxo de Caixa");
    doc.font("Helvetica");
    doc.text(`Lucro operacional (EBIT): ${fmt(conc.lucroOperacional)}`, { indent: 20 });
    doc.text(`(+) Variação contas a receber: ${fmt(conc.variacaoContasReceber)}`, { indent: 20 });
    doc.text(`(-) Variação estoque: ${fmt(conc.variacaoEstoque)}`, { indent: 20 });
    doc.text(`= Fluxo de caixa operacional: ${fmt(data.fluxo.fluxoOperacional ?? 0)}`, { indent: 20 });
  }
  doc.moveDown(0.5);
  doc.font("Helvetica").text(`Valor em estoque (custo): ${fmt(valorEstoque)}`, { indent: 20 });
  doc.text(`Valor presumido de venda do estoque: ${fmt(valorPresumidoVenda)}`, { indent: 20 });
  const evolucao = data.fluxo.evolucaoMensal ?? [];
  if (evolucao.length > 0) {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").text("Evolução mensal");
    doc.font("Helvetica").fontSize(8);
    const evColX = [50, 115, 180, 255, 330];
    const evColW = [60, 60, 70, 75, 80];
    const evHeaderY = doc.y;
    doc.text("Mês", evColX[0], evHeaderY, { width: evColW[0] });
    doc.text("Entradas", evColX[1], evHeaderY, { width: evColW[1] });
    doc.text("Saídas", evColX[2], evHeaderY, { width: evColW[2] });
    doc.text("Saldo período", evColX[3], evHeaderY, { width: evColW[3] });
    doc.text("Saldo acum.", evColX[4], evHeaderY, { width: evColW[4] });
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.2);
    const evRowH = 12;
    for (const r of evolucao) {
      if (doc.y > doc.page.height - 70) {
        doc.addPage();
        doc.font("Helvetica").fontSize(8);
        doc.text("Mês", evColX[0], doc.y, { width: evColW[0] });
        doc.text("Entradas", evColX[1], doc.y, { width: evColW[1] });
        doc.text("Saídas", evColX[2], doc.y, { width: evColW[2] });
        doc.text("Saldo período", evColX[3], doc.y, { width: evColW[3] });
        doc.text("Saldo acum.", evColX[4], doc.y, { width: evColW[4] });
        doc.moveDown(0.4);
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown(0.2);
      }
      const rowY = doc.y;
      doc.text(String(r.mes), evColX[0], rowY, { width: evColW[0] });
      doc.text(fmt(r.entradas), evColX[1], rowY, { width: evColW[1] });
      doc.text(fmt(r.saidas), evColX[2], rowY, { width: evColW[2] });
      doc.text(fmt(r.saldoPeriodo), evColX[3], rowY, { width: evColW[3] });
      doc.text(fmt(r.saldoAcumulado), evColX[4], rowY, { width: evColW[4] });
      doc.y = rowY + evRowH;
    }
    doc.fontSize(10);
  }
  doc.moveDown(1);
  doc.fontSize(9).fillColor("#555555");
  doc.text("Notas:", { continued: false });
  doc.text("• Vendas: vendas à vista. Parceladas entram em Promissórias recebidas quando pagas.", { indent: 10 });
  doc.text("• Valor em estoque (custo): custo médio × saldo atual.", { indent: 10 });
  doc.text("• Valor presumido de venda: preço tabela ou (custo + markup) × saldo atual.", { indent: 10 });
  doc.text("• Diferente do DRE: aqui vendas entram quando o caixa recebe (à vista ou quando promissória é paga).", { indent: 10 });
  doc.fillColor("#000000");
  doc.end();
}

export function gerarMargemPDF(
  data: {
    periodo: { mes: number; ano: number; firstDay?: string; lastDay?: string };
    itens: Array<Record<string, unknown>>;
    totalReceita?: number;
    margemAnterior?: { totalReceita: number; lucroTotal: number } | null;
  },
  // eslint-disable-next-line no-unused-vars -- params são parte da assinatura
  res: ApiResLike & { setHeader: (key: string, val: string) => void }
): void {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Margem-Produto-${periodoFilename(data.periodo.mes, data.periodo.ano)}.pdf"`
  );
  const doc = new PDFDocument({ margin: 50 }) as InstanceType<typeof PDFDocument>;
  doc.pipe(res as unknown as import("stream").Writable);
  doc.fontSize(18).font("Helvetica-Bold").text("Margem por Produto", { align: "center" });
  doc.moveDown(0.5);
  writeCabecalhoPeriodo(doc, data.periodo);
  const totalReceita = data.totalReceita ?? data.itens.reduce((s, r) => s + Number(r.receita || 0), 0);
  const totalCustos = data.itens.reduce((s, r) => s + Number(r.cogs || 0), 0);
  const totalLucro = data.itens.reduce((s, r) => s + Number(r.lucro || 0), 0);
  const margemMediaPonderada =
    totalReceita > 0
      ? data.itens.reduce((acc, i) => {
          const rec = Number(i.receita || 0);
          const marg = Number(i.margem || 0);
          return acc + (rec > 0 ? marg * rec : 0);
        }, 0) / totalReceita
      : 0;
  const colW = [150, 70, 55, 70, 55, 55, 60];
  doc.fontSize(9).font("Helvetica");
  doc.text(`Total vendas: ${fmt(totalReceita)} | ${data.itens.length} produtos | Margem média ponderada: ${margemMediaPonderada.toFixed(1)}%`, { indent: 0 });
  const margAnt = data.margemAnterior;
  if (margAnt && margAnt.totalReceita > 0) {
    const crescVendas = ((totalReceita - margAnt.totalReceita) / margAnt.totalReceita) * 100;
    doc.text(`Crescimento vendas vs ano anterior: ${crescVendas >= 0 ? "+" : ""}${Number(crescVendas).toFixed(1)}% (anterior: ${fmt(margAnt.totalReceita)})`, { indent: 0 });
  }
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold");
  doc.text("Produto", 50, doc.y);
  doc.text("Receita", 50 + colW[0], doc.y);
  doc.text("% Vend.", 50 + colW[0] + colW[1], doc.y);
  doc.text("Custos", 50 + colW[0] + colW[1] + colW[2], doc.y);
  doc.text("Lucro", 50 + colW[0] + colW[1] + colW[2] + colW[3], doc.y);
  doc.text("Marg.%", 50 + colW[0] + colW[1] + colW[2] + colW[3] + colW[4], doc.y);
  doc.text("Marg.unit", 50 + colW[0] + colW[1] + colW[2] + colW[3] + colW[4] + colW[5], doc.y);
  doc.moveDown(0.4);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(0.3);
  doc.font("Helvetica");
  const rowHeight = 14;
  for (const r of data.itens) {
    if (doc.y > doc.page.height - 80) doc.addPage();
    const rowY = doc.y;
    const rec = Number(r.receita || 0);
    const qty = Number(r.quantidade || 1);
    const pctVend = totalReceita > 0 ? ((rec / totalReceita) * 100).toFixed(1) : "0";
    const margUnit = qty > 0 ? (Number(r.lucro || 0) / qty).toFixed(2) : "-";
    const margemStr = r.margem != null ? `${Number(r.margem).toFixed(1)}%` : "N/D";
    doc.text(String(r.nome || "-").slice(0, 28), 50, rowY, { width: colW[0] });
    doc.text(fmt(rec), 50 + colW[0], rowY, { width: colW[1] });
    doc.text(`${pctVend}%`, 50 + colW[0] + colW[1], rowY, { width: colW[2] });
    doc.text(fmt(Number(r.cogs || 0)), 50 + colW[0] + colW[1] + colW[2], rowY, { width: colW[3] });
    doc.text(fmt(Number(r.lucro || 0)), 50 + colW[0] + colW[1] + colW[2] + colW[3], rowY, { width: colW[4] });
    doc.text(margemStr, 50 + colW[0] + colW[1] + colW[2] + colW[3] + colW[4], rowY, { width: colW[5] });
    doc.text(margUnit === "-" ? "-" : fmt(Number(margUnit)), 50 + colW[0] + colW[1] + colW[2] + colW[3] + colW[4] + colW[5], rowY, { width: colW[6] });
    doc.y = rowY + rowHeight;
  }
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(0.2);
  doc.font("Helvetica-Bold");
  const footerY = doc.y;
  doc.text("TOTAL", 50, footerY);
  doc.text(fmt(totalReceita), 50 + colW[0], footerY, { width: colW[1] });
  doc.text("100%", 50 + colW[0] + colW[1], footerY, { width: colW[2] });
  doc.text(fmt(totalCustos), 50 + colW[0] + colW[1] + colW[2], footerY, { width: colW[3] });
  doc.text(fmt(totalLucro), 50 + colW[0] + colW[1] + colW[2] + colW[3], footerY, { width: colW[4] });
  doc.text(totalReceita > 0 ? `${((totalLucro / totalReceita) * 100).toFixed(1)}%` : "-", 50 + colW[0] + colW[1] + colW[2] + colW[3] + colW[4], footerY, { width: colW[5] });
  doc.end();
}

export function gerarRankingPDF(
  data: {
    periodo: { mes: number; ano: number; firstDay?: string; lastDay?: string };
    tipo: string;
    ranking: Array<Record<string, unknown>>;
    totalGeral?: number;
    totalPedidosGeral?: number;
    ticketMedioGeral?: number;
    rankingAnterior?: { totalGeral: number } | null;
  },
  // eslint-disable-next-line no-unused-vars -- params são parte da assinatura
  res: ApiResLike & { setHeader: (key: string, val: string) => void }
): void {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Ranking-${data.tipo}-${periodoFilename(data.periodo.mes, data.periodo.ano)}.pdf"`
  );
  const doc = new PDFDocument({ margin: 50 }) as InstanceType<typeof PDFDocument>;
  doc.pipe(res as unknown as import("stream").Writable);
  doc.fontSize(18).font("Helvetica-Bold").text(`Ranking ${data.tipo === "vendas" ? "de Vendas (clientes)" : "de Fornecedores"}`, { align: "center" });
  doc.moveDown(0.5);
  writeCabecalhoPeriodo(doc, data.periodo);
  const totalGeral = data.totalGeral ?? data.ranking.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalPedidos = data.totalPedidosGeral ?? data.ranking.reduce((s, r) => s + Number(r.pedidos_count || 0), 0);
  const ticketMedio = data.ticketMedioGeral ?? (totalPedidos > 0 ? totalGeral / totalPedidos : 0);
  const entidadeLabel = data.tipo === "vendas" ? "clientes" : "fornecedores";
  doc.fontSize(9).font("Helvetica");
  doc.text(`Total vendas do período: ${fmt(totalGeral)} (${totalPedidos} pedidos) | Ticket médio: ${fmt(ticketMedio)}`, { indent: 0 });
  const totalTop10 = data.ranking.slice(0, 10).reduce((s, r) => s + Number(r.total || 0), 0);
  const pctTop10 = totalGeral > 0 ? ((totalTop10 / totalGeral) * 100).toFixed(1) : "0";
  doc.text(`Top ${data.ranking.length} ${entidadeLabel} no ranking. Top 10: ${fmt(totalTop10)} (${pctTop10}% do total).`, { indent: 0 });
  const rankAnt = data.rankingAnterior;
  if (rankAnt && data.tipo === "vendas" && rankAnt.totalGeral > 0 && totalGeral != null) {
    const cresc = ((totalGeral - rankAnt.totalGeral) / rankAnt.totalGeral) * 100;
    doc.text(`Crescimento vs ano anterior: ${cresc >= 0 ? "+" : ""}${Number(cresc).toFixed(1)}% (anterior: ${fmt(rankAnt.totalGeral)})`, { indent: 0 });
  }
  doc.moveDown(0.4);
  const isVendas = data.tipo === "vendas";
  const colW = isVendas ? [35, 160, 55, 80, 50, 65, 55] : [35, 200, 80, 100];
  doc.font("Helvetica-Bold");
  doc.text("#", 50, doc.y);
  doc.text("Cliente/Fornecedor", 50 + colW[0], doc.y);
  doc.text("Pedidos", 50 + colW[0] + colW[1], doc.y);
  doc.text("Total", 50 + colW[0] + colW[1] + colW[2], doc.y);
  doc.text("%", 50 + colW[0] + colW[1] + colW[2] + colW[3], doc.y);
  if (isVendas) {
    doc.text("Ticket", 50 + colW[0] + colW[1] + colW[2] + colW[3] + colW[4], doc.y);
    doc.text("Marg.%", 50 + colW[0] + colW[1] + colW[2] + colW[3] + colW[4] + colW[5], doc.y);
  }
  doc.moveDown(0.4);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(0.3);
  doc.font("Helvetica");
  const rowHeight = 14;
  data.ranking.forEach((r, i) => {
    if (doc.y > doc.page.height - 80) doc.addPage();
    const rowY = doc.y;
    const total = Number(r.total || 0);
    const pct = totalGeral > 0 ? ((total / totalGeral) * 100).toFixed(1) : "-";
    const ticket = Number(r.pedidos_count || 0) > 0 ? (total / Number(r.pedidos_count || 1)).toFixed(2) : "-";
    const margem = r.margemBruta != null ? `${Number(r.margemBruta).toFixed(1)}%` : "N/D";
    doc.text(String(i + 1), 50, rowY);
    doc.text(String(r.nome || "-").slice(0, isVendas ? 28 : 38), 50 + colW[0], rowY, { width: colW[1] });
    doc.text(String(r.pedidos_count || 0), 50 + colW[0] + colW[1], rowY, { width: colW[2] });
    doc.text(fmt(total), 50 + colW[0] + colW[1] + colW[2], rowY, { width: colW[3] });
    doc.text(`${pct}%`, 50 + colW[0] + colW[1] + colW[2] + colW[3], rowY, { width: colW[4] });
    if (isVendas) {
      doc.text(ticket === "-" ? "-" : fmt(Number(ticket)), 50 + colW[0] + colW[1] + colW[2] + colW[3] + colW[4], rowY, { width: colW[5] });
      doc.text(margem, 50 + colW[0] + colW[1] + colW[2] + colW[3] + colW[4] + colW[5], rowY, { width: 50 });
    }
    doc.y = rowY + rowHeight;
  });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(0.2);
  doc.font("Helvetica-Bold");
  const footerY = doc.y;
  doc.text("TOTAL GERAL", 50, footerY);
  doc.text(String(totalPedidos), 50 + colW[0] + colW[1], footerY, { width: colW[2] });
  doc.text(fmt(totalGeral), 50 + colW[0] + colW[1] + colW[2], footerY, { width: colW[3] });
  doc.text("100%", 50 + colW[0] + colW[1] + colW[2] + colW[3], footerY);
  if (isVendas) {
    doc.text(fmt(ticketMedio), 50 + colW[0] + colW[1] + colW[2] + colW[3] + colW[4], footerY, { width: colW[5] });
  }
  doc.end();
}

export type PayloadConsolidadoPDF = {
  periodo: { mes: number; ano: number; firstDay?: string; lastDay?: string };
  dre: Record<string, number>;
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

  // === Página 1: Resumo executivo ===
  doc.fontSize(14).font("Helvetica-Bold").text("1. Resumo executivo", { continued: false });
  doc.fontSize(10).font("Helvetica");
  const ind = data.indicadores;
  const d = data.dre;
  const fluxo = data.fluxo;
  doc.text(`Saldo final de caixa: ${fmt(fluxo.saldoFinal ?? 0)}`, { indent: 10 });
  doc.text(`Fluxo operacional: ${fmt(fluxo.fluxoOperacional ?? 0)}`, { indent: 10 });
  doc.text(`Margem bruta: ${d.margemBruta ?? 0}%`, { indent: 10 });
  doc.text(`Lucro operacional: ${fmt(d.lucroOperacional ?? 0)}`, { indent: 10 });
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

  // === Página 2: DRE + Fluxo ===
  if (doc.y > doc.page.height - 180) doc.addPage();
  doc.fontSize(14).font("Helvetica-Bold").text("2. DRE e Fluxo de Caixa", { continued: false });
  doc.fontSize(10).font("Helvetica");
  doc.text(`Receitas: ${fmt(d.receitas ?? 0)} | Lucro bruto: ${fmt(d.lucroBruto ?? 0)} (${d.margemBruta ?? 0}%)`, { indent: 10 });
  doc.text(`Despesas: -${fmt(d.despesas ?? 0)} | Lucro operacional: ${fmt(d.lucroOperacional ?? 0)}`, { indent: 10 });
  doc.text(`Entradas: ${fmt(fluxo.entradas?.total ?? 0)} | Saídas: ${fmt(fluxo.saidas?.total ?? 0)} | Saldo período: ${fmt(fluxo.saldo ?? 0)}`, { indent: 10 });
  doc.text(`Saldo final: ${fmt(fluxo.saldoFinal ?? 0)}`, { indent: 10 });
  doc.moveDown(1);

  // === Página 3: Top produtos ===
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.fontSize(14).font("Helvetica-Bold").text("3. Top produtos (margem)", { continued: false });
  doc.fontSize(9).font("Helvetica");
  const itensMargem = (data.margem?.itens ?? []).slice(0, 15);
  const totalRec = data.margem?.totalReceita ?? 0;
  if (itensMargem.length > 0) {
    const colX = [50, 180, 250, 310, 370];
    doc.text("Produto", colX[0], doc.y);
    doc.text("Receita", colX[1], doc.y);
    doc.text("% Vend.", colX[2], doc.y);
    doc.text("Margem", colX[3], doc.y);
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.2);
    for (const r of itensMargem) {
      if (doc.y > doc.page.height - 70) doc.addPage();
      const rec = Number(r.receita || 0);
      const pct = totalRec > 0 ? ((rec / totalRec) * 100).toFixed(1) : "0";
      const margemStr = r.margem != null ? `${Number(r.margem).toFixed(1)}%` : "-";
      doc.text(String(r.nome ?? "-").slice(0, 30), colX[0], doc.y, { width: 125 });
      doc.text(fmt(rec), colX[1], doc.y, { width: 65 });
      doc.text(`${pct}%`, colX[2], doc.y, { width: 55 });
      doc.text(margemStr, colX[3], doc.y, { width: 55 });
      doc.y += 14;
    }
  }
  doc.moveDown(1);

  // === Página 4: Top clientes ===
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.fontSize(14).font("Helvetica-Bold").text("4. Top clientes", { continued: false });
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

  // === Página 5: Evolução mensal (se houver) ===
  const evolucao = fluxo.evolucaoMensal ?? [];
  if (evolucao.length > 0) {
    if (doc.y > doc.page.height - 100) doc.addPage();
    doc.fontSize(14).font("Helvetica-Bold").text("5. Evolução mensal", { continued: false });
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
