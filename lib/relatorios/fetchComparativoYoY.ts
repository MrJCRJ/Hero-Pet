/**
 * Comparativo interanual mês a mês: mesma janela [firstDay, lastDay) vs um ano antes.
 */
import { fetchDreMesAMes, type DreMesRow } from "@/lib/relatorios/fetchDreMesAMes";

export interface ComparativoYoYMes {
  mes: string;
  receitas: number;
  receitas_ano_anterior: number;
  lucro_operacional: number;
  lucro_operacional_ano_anterior: number;
  var_receita_pct: number | null;
  var_lucro_operacional_pct: number | null;
}

function subtrairUmAno(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${y - 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export async function fetchComparativoInteranual(
  mesesAtual: DreMesRow[],
  firstDay: string,
  lastDay: string
): Promise<{ meses: ComparativoYoYMes[] } | null> {
  if (!mesesAtual.length) return null;
  const fAnt = subtrairUmAno(firstDay);
  const lAnt = subtrairUmAno(lastDay);
  const mesesAnt = await fetchDreMesAMes(fAnt, lAnt);
  const n = Math.min(mesesAtual.length, mesesAnt.length);
  const meses: ComparativoYoYMes[] = [];
  for (let i = 0; i < n; i++) {
    const a = mesesAtual[i];
    const b = mesesAnt[i];
    const rec = a.receitas;
    const recAnt = b.receitas;
    const lo = a.lucro_operacional;
    const loAnt = b.lucro_operacional;
    const varRec =
      recAnt != null && recAnt !== 0
        ? Number((((rec - recAnt) / recAnt) * 100).toFixed(2))
        : null;
    const varLo =
      loAnt != null && loAnt !== 0
        ? Number((((lo - loAnt) / Math.abs(loAnt)) * 100).toFixed(2))
        : loAnt === 0 && lo !== 0
          ? null
          : loAnt === 0 && lo === 0
            ? 0
            : null;
    meses.push({
      mes: a.mes,
      receitas: rec,
      receitas_ano_anterior: recAnt,
      lucro_operacional: lo,
      lucro_operacional_ano_anterior: loAnt,
      var_receita_pct: varRec,
      var_lucro_operacional_pct: varLo,
    });
  }
  return { meses };
}
