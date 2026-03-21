/**
 * Utilitários compartilhados para geração de PDFs.
 */
import type PDFDocument from "pdfkit";
import EMITENTE from "@/lib/constants/company";

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function periodoLabel(mes: number, ano: number): string {
  if (ano === 0) return "Últimos 12 meses";
  if (mes === 0 || !mes) return `Ano ${ano} (todos os meses)`;
  return `${MESES[mes - 1]} de ${ano}`;
}

export function mesSelecionadoLabel(mes: number): string {
  if (mes === 0 || !mes) return "Todos os meses";
  return MESES[mes - 1];
}

export function anoSelecionadoLabel(ano: number): string {
  if (ano === 0) return "Últimos 12 meses";
  return String(ano);
}

export function fmt(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export function formatDateBR(ymd: string): string {
  if (!ymd || typeof ymd !== "string") return "";
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

export function getDataGeracao(): string {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Garante que o texto use apenas caracteres suportados (Latin-1) para evitar corrupção no PDF. */
export function sanitizeForPdf(s: string): string {
  return s.replace(/[\u0100-\uFFFF]/g, "?");
}

export function writeCabecalhoPeriodo(
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
