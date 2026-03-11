import database from "infra/database.js";
import { addMonths, proximasDatasMensais, proximasDatasAnuais } from "@/lib/despesas/recorrencia";

/** Buffer de meses à frente para manter (gerar se faltar) */
const MESES_BUFFER = 3;
const QUANTIDADE_GERAR = 6;

export async function gerarDespesasRecorrentesFuturas(): Promise<{
  geradas: number;
  modelos: number;
  erro?: string;
}> {
  const result = await database.query({
    text: `SELECT id, descricao, categoria, valor, recorrencia_frequencia, recorrencia_dia, recorrencia_mes
           FROM despesas WHERE recorrente = true ORDER BY id`,
  });
  const modelos = result.rows as Array<{
    id: number;
    descricao: string;
    categoria: string;
    valor: number;
    recorrencia_frequencia: string;
    recorrencia_dia: number;
    recorrencia_mes: number | null;
  }>;

  if (modelos.length === 0) {
    return { geradas: 0, modelos: 0 };
  }

  let totalGeradas = 0;

  for (const m of modelos) {
    const lastR = await database.query({
      text: `SELECT MAX(data_vencimento)::text as max_data FROM despesas
             WHERE despesa_modelo_id = $1 OR id = $1`,
      values: [m.id],
    });
    const maxStr = (lastR.rows[0] as Record<string, unknown>)?.max_data as string | null;
    const ultimaData = maxStr ? new Date(maxStr) : new Date();

    const freq = m.recorrencia_frequencia || "mensal";
    const dia = m.recorrencia_dia || 1;
    const mesAnual = m.recorrencia_mes ?? 1;

    const proximoInicio = freq === "mensal" ? addMonths(ultimaData, 1) : new Date(ultimaData.getFullYear() + 1, mesAnual - 1, 1);
    const proximas =
      freq === "anual"
        ? proximasDatasAnuais(mesAnual, dia, proximoInicio, QUANTIDADE_GERAR)
        : proximasDatasMensais(dia, proximoInicio, QUANTIDADE_GERAR);

    const datasFuturas = proximas.filter((d) => new Date(d) > ultimaData);
    if (datasFuturas.length === 0) continue;

    const insertText = `
      INSERT INTO despesas (descricao, categoria, valor, data_vencimento, status, fornecedor_id, observacao, recorrente, despesa_modelo_id)
      VALUES ($1, $2, $3, $4, 'pendente', NULL, NULL, false, $5)
    `;
    for (const data of datasFuturas) {
      await database.query({
        text: insertText,
        values: [m.descricao, m.categoria, m.valor, data, m.id],
      });
      totalGeradas += 1;
    }
  }

  return { geradas: totalGeradas, modelos: modelos.length };
}
