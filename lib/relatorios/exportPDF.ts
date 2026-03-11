import PDFDocument from "pdfkit";
import type { ApiResLike } from "@/server/api/v1/types";

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export function gerarDREPDF(
  data: {
    periodo: { mes: number; ano: number };
    dre: Record<string, number>;
  },
  // eslint-disable-next-line no-unused-vars -- params são parte da assinatura
  res: ApiResLike & { setHeader: (key: string, val: string) => void }
): void {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="DRE-${data.periodo.ano}-${String(data.periodo.mes).padStart(2, "0")}.pdf"`
  );
  const doc = new PDFDocument({ margin: 50 }) as InstanceType<typeof PDFDocument>;
  doc.pipe(res as unknown as import("stream").Writable);
  const mesNome = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ][data.periodo.mes - 1];
  doc.fontSize(18).font("Helvetica-Bold").text("DRE — Demonstração do Resultado", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).font("Helvetica").text(`${mesNome} de ${data.periodo.ano}`, { align: "center" });
  doc.moveDown(1);
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
  doc.end();
}

export function gerarFluxoCaixaPDF(
  data: {
    periodo: { mes: number; ano: number };
    fluxo: { entradas: Record<string, number>; saidas: Record<string, number>; saldo: number };
  },
  // eslint-disable-next-line no-unused-vars -- params são parte da assinatura
  res: ApiResLike & { setHeader: (key: string, val: string) => void }
): void {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Fluxo-Caixa-${data.periodo.ano}-${String(data.periodo.mes).padStart(2, "0")}.pdf"`
  );
  const doc = new PDFDocument({ margin: 50 }) as InstanceType<typeof PDFDocument>;
  doc.pipe(res as unknown as import("stream").Writable);
  const mesNome = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ][data.periodo.mes - 1];
  doc.fontSize(18).font("Helvetica-Bold").text("Fluxo de Caixa", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).font("Helvetica").text(`${mesNome} de ${data.periodo.ano}`, { align: "center" });
  doc.moveDown(1);
  const e = data.fluxo.entradas;
  const s = data.fluxo.saidas;
  doc.fontSize(10).font("Helvetica-Bold").text("Entradas");
  doc.font("Helvetica");
  doc.text(`Vendas: ${fmt(e?.vendas || 0)}`, { indent: 20 });
  doc.text(`Promissórias recebidas: ${fmt(e?.promissoriasRecebidas || 0)}`, { indent: 20 });
  doc.text(`Total: ${fmt(e?.total || 0)}`, { indent: 20 });
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").text("Saídas");
  doc.font("Helvetica");
  doc.text(`Compras: ${fmt(s?.compras || 0)}`, { indent: 20 });
  doc.text(`Despesas: ${fmt(s?.despesas || 0)}`, { indent: 20 });
  doc.text(`Total: ${fmt(s?.total || 0)}`, { indent: 20 });
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").text(`Saldo do período: ${fmt(data.fluxo.saldo)}`);
  doc.end();
}

export function gerarMargemPDF(
  data: {
    periodo: { mes: number; ano: number };
    itens: Array<Record<string, unknown>>;
  },
  // eslint-disable-next-line no-unused-vars -- params são parte da assinatura
  res: ApiResLike & { setHeader: (key: string, val: string) => void }
): void {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Margem-Produto-${data.periodo.ano}-${String(data.periodo.mes).padStart(2, "0")}.pdf"`
  );
  const doc = new PDFDocument({ margin: 50 }) as InstanceType<typeof PDFDocument>;
  doc.pipe(res as unknown as import("stream").Writable);
  const mesNome = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ][data.periodo.mes - 1];
  doc.fontSize(18).font("Helvetica-Bold").text("Margem por Produto", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).font("Helvetica").text(`${mesNome} de ${data.periodo.ano}`, { align: "center" });
  doc.moveDown(1);
  const colW = [180, 80, 80, 80, 80, 60];
  doc.fontSize(9).font("Helvetica-Bold");
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
  doc.end();
}

export function gerarRankingPDF(
  data: {
    periodo: { mes: number; ano: number };
    tipo: string;
    ranking: Array<Record<string, unknown>>;
  },
  // eslint-disable-next-line no-unused-vars -- params são parte da assinatura
  res: ApiResLike & { setHeader: (key: string, val: string) => void }
): void {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Ranking-${data.tipo}-${data.periodo.ano}-${String(data.periodo.mes).padStart(2, "0")}.pdf"`
  );
  const doc = new PDFDocument({ margin: 50 }) as InstanceType<typeof PDFDocument>;
  doc.pipe(res as unknown as import("stream").Writable);
  const mesNome = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ][data.periodo.mes - 1];
  doc.fontSize(18).font("Helvetica-Bold").text(`Ranking ${data.tipo === "vendas" ? "de Vendas (clientes)" : "de Fornecedores"}`, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).font("Helvetica").text(`${mesNome} de ${data.periodo.ano}`, { align: "center" });
  doc.moveDown(1);
  doc.fontSize(9).font("Helvetica-Bold");
  doc.text("#", 50, doc.y);
  doc.text("Cliente/Fornecedor", 80, doc.y);
  doc.text("Pedidos", 350, doc.y);
  doc.text("Total", 420, doc.y);
  doc.moveDown(0.4);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(0.3);
  doc.font("Helvetica");
  data.ranking.forEach((r, i) => {
    if (doc.y > doc.page.height - 80) doc.addPage();
    doc.text(String(i + 1), 50, doc.y);
    doc.text(String(r.nome || "").slice(0, 45), 80, doc.y - 12, { width: 260 });
    doc.text(String(r.pedidos_count || 0), 350, doc.y - 12);
    doc.text(fmt(Number(r.total || 0)), 420, doc.y - 12);
    doc.moveDown(0.4);
  });
  doc.end();
}
