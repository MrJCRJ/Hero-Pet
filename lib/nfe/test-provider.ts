/**
 * Provider de teste para NF-e.
 * Simula emissão bem-sucedida ou falha para testar a interface sem provedor real.
 * Use NFE_PROVIDER=test em ambiente de desenvolvimento.
 */

import database from "infra/database";
import type {
  EmitirNFePayload,
  EmitirNFeResult,
  ConsultarNFeResult,
  CancelarNFeResult,
} from "./provider";

export async function consultarNFeTest(pedidoId: number): Promise<ConsultarNFeResult> {
  try {
    const r = await database.query({
      text: `SELECT chave_acesso, protocolo, status, danfe_url, xml_url, erro
             FROM pedido_nfe WHERE pedido_id = $1`,
      values: [pedidoId],
    });
    if (!r.rows?.length) {
      return { status: "pendente" };
    }
    const row = r.rows[0] as Record<string, unknown>;
    return {
      status: (row.status as string) || "pendente",
      chaveAcesso: row.chave_acesso as string | undefined,
      protocolo: row.protocolo as string | undefined,
      danfeUrl: row.danfe_url as string | undefined,
      xmlUrl: row.xml_url as string | undefined,
      erro: row.erro as string | undefined,
    };
  } catch {
    return { status: "erro", erro: "Erro ao consultar NF-e no banco" };
  }
}

export async function cancelarNFeTest(
  pedidoId: number,
  motivo: string, // usado para API; ignorado em teste
): Promise<CancelarNFeResult> {
  void motivo;
  try {
    const r = await database.query({
      text: `UPDATE pedido_nfe SET status = 'cancelada', erro = NULL, updated_at = NOW()
             WHERE pedido_id = $1 AND status = 'autorizada' RETURNING 1`,
      values: [pedidoId],
    });
    if (!r.rows?.length) {
      const check = await database.query({
        text: "SELECT status FROM pedido_nfe WHERE pedido_id = $1",
        values: [pedidoId],
      });
      if (!check.rows?.length) {
        return { ok: false, erro: "NF-e não encontrada para este pedido" };
      }
      const st = (check.rows[0] as { status: string }).status;
      if (st === "cancelada") {
        return { ok: false, erro: "NF-e já está cancelada" };
      }
      if (st !== "autorizada") {
        return { ok: false, erro: "Apenas NF-e autorizada pode ser cancelada" };
      }
    }
    return { ok: true };
  } catch (e) {
    console.error("cancelarNFeTest error", e);
    return { ok: false, erro: "Erro ao cancelar NF-e" };
  }
}

export async function emitirNFeTest(
  payload: EmitirNFePayload,
  simulacaoFalha?: boolean
): Promise<EmitirNFeResult> {
  if (simulacaoFalha ?? process.env.NFE_TEST_FAIL === "1") {
    return {
      ok: false,
      erro: "Simulação de falha (NFE_TEST_FAIL=1)",
    };
  }
  // Simula sucesso com chave fictícia
  const chave = "1" + String(payload.pedidoId).padStart(8, "0") + "0000000000000000000000000000000000000000".slice(0, 35);
  return {
    ok: true,
    chaveAcesso: chave,
    protocolo: `9${String(Date.now()).slice(-14)}`,
    danfeUrl: `https://nfe.fazenda.gov.br/simulacao/danfe/${chave}`,
    xmlUrl: undefined,
  };
}
