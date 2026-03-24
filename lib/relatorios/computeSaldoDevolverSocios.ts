/**
 * Calcula o saldo a devolver aos sócios com base no histórico de aportes e devoluções.
 * saldo_a_devolver = total aportes - total devolvido (categoria devolucao_capital em despesas)
 */

import database from "infra/database.js";

export async function computeSaldoDevolverSocios(): Promise<number> {
  const [aportesR, devolvidoR] = await Promise.all([
    database.query({
      text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total FROM aportes_capital`,
    }),
    database.query({
      text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total
             FROM despesas
             WHERE categoria::text = 'devolucao_capital'`,
    }),
  ]);

  const aportes = Number((aportesR.rows[0] as Record<string, unknown>)?.total ?? 0);
  const devolvido = Number((devolvidoR.rows[0] as Record<string, unknown>)?.total ?? 0);
  return Math.max(0, Number((aportes - devolvido).toFixed(2)));
}
