import database from "infra/database.js";

export interface MetaMensalRow {
  ano: number;
  mes: number;
  meta_receita: number;
  meta_lucro_operacional: number;
  meta_margem_operacional: number | null;
}

export async function fetchMetasMensais(ano: number, meses: number[]): Promise<MetaMensalRow[]> {
  const mesesUniq = [...new Set(meses)].filter((m) => m >= 1 && m <= 12);
  if (mesesUniq.length === 0) return [];

  const r = await database.query({
    text: `SELECT ano, mes,
                  meta_receita, meta_lucro_operacional, meta_margem_operacional
             FROM metas_mensais
            WHERE ano = $1 AND mes = ANY($2::int[])
            ORDER BY mes ASC`,
    values: [ano, mesesUniq],
  });

  const rows = r.rows as Array<Record<string, unknown>>;
  return rows.map((x) => ({
    ano: Number(x.ano || 0),
    mes: Number(x.mes || 0),
    meta_receita: Number(x.meta_receita || 0),
    meta_lucro_operacional: Number(x.meta_lucro_operacional || 0),
    meta_margem_operacional: x.meta_margem_operacional == null ? null : Number(x.meta_margem_operacional),
  }));
}

