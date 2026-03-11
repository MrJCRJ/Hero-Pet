/**
 * Utilitários para despesas recorrentes.
 * Usa Date nativo (sem date-fns).
 */

/** Retorna o último dia do mês para o ano dado */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Adiciona meses à data, tratando 31→28/29 em fevereiro */
export function addMonths(date: Date, months: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const newMonth = m + months;
  const newYear = y + Math.floor(newMonth / 12);
  const newM = ((newMonth % 12) + 12) % 12;
  const last = lastDayOfMonth(newYear, newM + 1);
  const newD = Math.min(d, last);
  return new Date(newYear, newM, newD);
}

/** Gera datas de vencimento para os próximos N ocorrências (mensal) */
export function proximasDatasMensais(
  dia: number,
  inicio: Date,
  quantidade: number
): string[] {
  const dates: string[] = [];
  let current = new Date(inicio.getFullYear(), inicio.getMonth(), Math.min(dia, lastDayOfMonth(inicio.getFullYear(), inicio.getMonth() + 1)));
  for (let i = 0; i < quantidade; i++) {
    dates.push(current.toISOString().slice(0, 10));
    current = addMonths(current, 1);
  }
  return dates;
}

/** Gera datas de vencimento para os próximos N ocorrências (anual) */
export function proximasDatasAnuais(
  mes: number,
  dia: number,
  inicio: Date,
  quantidade: number
): string[] {
  const dates: string[] = [];
  let y = inicio.getFullYear();
  let m = inicio.getMonth() + 1;
  if (m > mes || (m === mes && inicio.getDate() >= dia)) {
    y += 1;
  }
  for (let i = 0; i < quantidade; i++) {
    const last = lastDayOfMonth(y, mes);
    const d = Math.min(dia, last);
    dates.push(`${y}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    y += 1;
  }
  return dates;
}
