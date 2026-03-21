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
  doc.text(EMITENTE.razao, { align: "center" });
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

export function gerarDREPDF(
  data: {
    periodo: { mes: number; ano: number; firstDay?: string; lastDay?: string };
    dre: Record<string, number>;
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
  doc.fontSize(10).font("Helvetica");
  doc.text(`Receitas (vendas): ${fmt(d.receitas || 0)}`);
  doc.text(`(-) Custos (COGS): -${fmt(d.custosVendas || 0)}`, { indent: 20 });
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").text(`Lucro bruto: ${fmt(d.lucroBruto || 0)} (${d.margemBruta || 0}%)`);
  doc.font("Helvetica");
  doc.text(`(-) Despesas: -${fmt(d.despesas || 0)}`, { indent: 20 });
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").text(`Lucro operacional: ${fmt(d.lucroOperacional || 0)} (${d.margemOperacional || 0}%)`);
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
  const valorEstoque = data.fluxo.valorEstoque ?? 0;
  const valorPresumidoVenda = data.fluxo.valorPresumidoVendaEstoque ?? 0;
  doc.moveDown(0.3);
  doc.font("Helvetica").text(`Valor em estoque (custo): ${fmt(valorEstoque)}`, { indent: 20 });
  doc.text(`Valor presumido de venda do estoque: ${fmt(valorPresumidoVenda)}`, { indent: 20 });
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
  const colW = [180, 80, 80, 80, 80, 60];
  const totalReceita = data.itens.reduce((s, r) => s + Number(r.receita || 0), 0);
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
  doc.fontSize(9).font("Helvetica");
  doc.text(`${data.itens.length} produtos no relatório. Margem média ponderada: ${margemMediaPonderada.toFixed(1)}%`, { indent: 0 });
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold");
  doc.text("Produto", 50, doc.y);
  doc.text("Receita", 50 + colW[0], doc.y);
  doc.text("Custos", 50 + colW[0] + colW[1], doc.y);
  doc.text("Lucro", 50 + colW[0] + colW[1] + colW[2], doc.y);
  doc.text("Margem %", 50 + colW[0] + colW[1] + colW[2] + colW[3], doc.y);
  doc.moveDown(0.4);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(0.3);
  doc.font("Helvetica");
  for (const r of data.itens) {
    if (doc.y > doc.page.height - 80) doc.addPage();
    doc.text(String(r.nome || "").slice(0, 28), 50, doc.y, { width: colW[0] });
    doc.text(fmt(Number(r.receita || 0)), 50 + colW[0], doc.y - 12, { width: colW[1] });
    doc.text(fmt(Number(r.cogs || 0)), 50 + colW[0] + colW[1], doc.y - 12, { width: colW[2] });
    doc.text(fmt(Number(r.lucro || 0)), 50 + colW[0] + colW[1] + colW[2], doc.y - 12, { width: colW[3] });
    doc.text(`${Number(r.margem || 0).toFixed(1)}%`, 50 + colW[0] + colW[1] + colW[2] + colW[3], doc.y - 12);
    doc.moveDown(0.4);
  }
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(0.2);
  doc.font("Helvetica-Bold");
  doc.text("TOTAL", 50, doc.y);
  doc.text(fmt(totalReceita), 50 + colW[0], doc.y - 12, { width: colW[1] });
  doc.text(fmt(totalCustos), 50 + colW[0] + colW[1], doc.y - 12, { width: colW[2] });
  doc.text(fmt(totalLucro), 50 + colW[0] + colW[1] + colW[2], doc.y - 12, { width: colW[3] });
  doc.text(totalReceita > 0 ? `${((totalLucro / totalReceita) * 100).toFixed(1)}%` : "-", 50 + colW[0] + colW[1] + colW[2] + colW[3], doc.y - 12);
  doc.end();
}

export function gerarRankingPDF(
  data: {
    periodo: { mes: number; ano: number; firstDay?: string; lastDay?: string };
    tipo: string;
    ranking: Array<Record<string, unknown>>;
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
  const totalGeral = data.ranking.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalPedidos = data.ranking.reduce((s, r) => s + Number(r.pedidos_count || 0), 0);
  const entidadeLabel = data.tipo === "vendas" ? "clientes" : "fornecedores";
  doc.fontSize(9).font("Helvetica");
  doc.text(`Top ${data.ranking.length} ${entidadeLabel} no período. Total: ${fmt(totalGeral)} (${totalPedidos} pedidos)`, { indent: 0 });
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold");
  doc.text("#", 50, doc.y);
  doc.text("Cliente/Fornecedor", 80, doc.y);
  doc.text("Pedidos", 350, doc.y);
  doc.text("Total", 420, doc.y);
  doc.text("%", 500, doc.y);
  doc.moveDown(0.4);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(0.3);
  doc.font("Helvetica");
  data.ranking.forEach((r, i) => {
    if (doc.y > doc.page.height - 80) doc.addPage();
    const pct = totalGeral > 0 ? ((Number(r.total || 0) / totalGeral) * 100).toFixed(1) : "-";
    doc.text(String(i + 1), 50, doc.y);
    doc.text(String(r.nome || "").slice(0, 45), 80, doc.y - 12, { width: 260 });
    doc.text(String(r.pedidos_count || 0), 350, doc.y - 12);
    doc.text(fmt(Number(r.total || 0)), 420, doc.y - 12);
    doc.text(`${pct}%`, 500, doc.y - 12, { width: 50 });
    doc.moveDown(0.4);
  });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(0.2);
  doc.font("Helvetica-Bold");
  doc.text("TOTAL", 50, doc.y);
  doc.text(String(totalPedidos), 350, doc.y - 12);
  doc.text(fmt(totalGeral), 420, doc.y - 12);
  doc.text("100%", 500, doc.y - 12, { width: 50 });
  doc.end();
}
