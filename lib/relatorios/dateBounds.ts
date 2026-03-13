/**
 * Sufixo para nomes de arquivo de relatório.
 * mes=0, ano=0 → "todos" | mes=0, ano>0 → "2025" | mes>0 → "2025-01"
 */
export function periodoFilename(mes: number, ano: number): string {
  if (ano === 0) return "todos";
  if (mes === 0 || !mes) return String(ano);
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

/**
 * Calcula firstDay e lastDay para relatórios.
 * mes=0 = todos os meses do ano
 * ano=0 = ano todo (todos os anos / histórico completo)
 */
export function getReportBounds(mes: number, ano: number): {
  firstDay: string;
  lastDay: string;
  isFullYear: boolean;
  isAllTime: boolean;
} {
  if (ano === 0) {
    return {
      firstDay: "2000-01-01",
      lastDay: "2031-01-01", // exclusivo
      isFullYear: false,
      isAllTime: true,
    };
  }
  if (mes === 0) {
    return {
      firstDay: `${ano}-01-01`,
      lastDay: `${ano + 1}-01-01`,
      isFullYear: true,
      isAllTime: false,
    };
  }
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAno = mes === 12 ? ano + 1 : ano;
  return {
    firstDay: `${ano}-${String(mes).padStart(2, "0")}-01`,
    lastDay: `${nextAno}-${String(nextMes).padStart(2, "0")}-01`,
    isFullYear: false,
    isAllTime: false,
  };
}
