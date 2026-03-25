import type { DreMesRow } from "@/lib/relatorios/fetchDreMesAMes";

export interface DreMesComMedias extends DreMesRow {
  receita_media_movel_3: number | null;
  receita_media_movel_6: number | null;
  receita_media_movel_12: number | null;
  lucro_op_media_movel_3: number | null;
  lucro_op_media_movel_6: number | null;
  lucro_op_media_movel_12: number | null;
}

function mm(values: number[], i: number, window: number): number | null {
  if (i < window - 1) return null;
  const slice = values.slice(i - window + 1, i + 1);
  const s = slice.reduce((a, b) => a + b, 0);
  return Number((s / window).toFixed(2));
}

export function enrichSerieComMediasMoveis(meses: DreMesRow[]): DreMesComMedias[] {
  const rec = meses.map((m) => m.receitas);
  const lo = meses.map((m) => m.lucro_operacional);
  return meses.map((m, i) => ({
    ...m,
    receita_media_movel_3: mm(rec, i, 3),
    receita_media_movel_6: mm(rec, i, 6),
    receita_media_movel_12: mm(rec, i, 12),
    lucro_op_media_movel_3: mm(lo, i, 3),
    lucro_op_media_movel_6: mm(lo, i, 6),
    lucro_op_media_movel_12: mm(lo, i, 12),
  }));
}
