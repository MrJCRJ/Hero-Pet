/**
 * Cliente Focus NFe para NF-e.
 * Documentação: https://focusnfe.com.br/doc/
 *
 * Configure NFE_PROVIDER=focus e NFE_API_TOKEN com seu token.
 * Certificado A1: requer armazenamento seguro (env ou arquivo).
 */

import database from "infra/database";
import type { ConsultarNFeResult, CancelarNFeResult } from "./provider";
import { mensagemErroSefaz } from "./provider";

const BASE_URL = "https://api.focusnfe.com.br";

function getAuthHeader(): string {
  const token = process.env.NFE_API_TOKEN;
  if (!token) throw new Error("NFE_API_TOKEN não configurado");
  return "Basic " + Buffer.from(token + ":").toString("base64");
}

async function fetchFocus(
  path: string,
  opts: { method?: string; body?: string } = {},
  retries = 2
): Promise<{ status: number; data: Record<string, unknown> }> {
  const url = BASE_URL + path;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: opts.method || "GET",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: opts.body,
      });
      if ((res.status === 503 || res.status === 504) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        /* body vazio ou inválido */
      }
      return { status: res.status, data };
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return { status: 503, data: { mensagem: "Serviço temporariamente indisponível" } };
}

export async function consultarNFeFocus(
  pedidoId: number
): Promise<ConsultarNFeResult> {
  const r = await database.query({
    text: "SELECT chave_acesso, status FROM pedido_nfe WHERE pedido_id = $1",
    values: [pedidoId],
  });
  if (!r.rows?.length) {
    return { status: "pendente" };
  }
  const row = r.rows[0] as { chave_acesso: string; status: string };
  const chave = row.chave_acesso;
  if (!chave) {
    return {
      status: row.status || "pendente",
      erro: "Chave de acesso não encontrada",
    };
  }

  try {
    const { status, data } = await fetchFocus(
      `/v2/nfe/${encodeURIComponent(chave)}`
    );
    if (status === 200) {
      const st = (data.status as string) || "autorizada";
      const ref = data.caminho_xml_nota_fiscal as string | undefined;
      await database.query({
        text: `UPDATE pedido_nfe SET status = $1, xml_url = $2, updated_at = NOW()
               WHERE pedido_id = $3`,
        values: [st, ref || null, pedidoId],
      });
      return {
        status: st,
        chaveAcesso: chave,
        protocolo: data.numero_protocolo as string | undefined,
        danfeUrl: data.caminho_danfe as string | undefined,
        xmlUrl: ref,
      };
    }
    const codigo = (data.codigo as string) || String(status);
    const msg =
      (data.mensagem as string) || mensagemErroSefaz(codigo);
    await database.query({
      text: `UPDATE pedido_nfe SET erro = $1, updated_at = NOW() WHERE pedido_id = $2`,
      values: [msg, pedidoId],
    });
    return { status: "erro", erro: msg };
  } catch (e) {
    const err = e as Error;
    const msg = err.message || "Erro ao consultar NF-e na SEFAZ";
    return { status: "erro", erro: msg };
  }
}

export async function cancelarNFeFocus(
  pedidoId: number,
  motivo: string
): Promise<CancelarNFeResult> {
  if (!motivo || motivo.trim().length < 15) {
    return {
      ok: false,
      erro: "Justificativa de cancelamento deve ter no mínimo 15 caracteres",
    };
  }

  const r = await database.query({
    text: "SELECT chave_acesso, status FROM pedido_nfe WHERE pedido_id = $1",
    values: [pedidoId],
  });
  if (!r.rows?.length) {
    return { ok: false, erro: "NF-e não encontrada para este pedido" };
  }
  const row = r.rows[0] as { chave_acesso: string; status: string };
  if (row.status !== "autorizada") {
    return {
      ok: false,
      erro:
        row.status === "cancelada"
          ? "NF-e já está cancelada"
          : "Apenas NF-e autorizada pode ser cancelada",
    };
  }

  const chave = row.chave_acesso;
  if (!chave) {
    return { ok: false, erro: "Chave de acesso não encontrada" };
  }

  try {
    const { status, data } = await fetchFocus(
      `/v2/nfe/${encodeURIComponent(chave)}`,
      {
        method: "DELETE",
        body: JSON.stringify({ justificativa: motivo.trim() }),
      }
    );
    if (status === 200 || status === 204) {
      await database.query({
        text: `UPDATE pedido_nfe SET status = 'cancelada', erro = NULL, updated_at = NOW()
               WHERE pedido_id = $1`,
        values: [pedidoId],
      });
      return { ok: true };
    }
    const codigo = (data.codigo as string) || String(status);
    const msg =
      (data.mensagem as string) || mensagemErroSefaz(codigo);
    return { ok: false, erro: msg };
  } catch (e) {
    const err = e as Error;
    return { ok: false, erro: err.message || "Erro ao cancelar NF-e" };
  }
}
