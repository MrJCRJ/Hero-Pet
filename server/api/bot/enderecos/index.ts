import database from "infra/database";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { BotEnderecoSchema } from "@/server/api/bot/schemas";
import { sanitizeForBotLogs } from "@/server/api/bot/logging";
import { consultarCep } from "@/lib/viacep";

interface BairroWarning {
  code: string;
  message: string;
}

function normalizeBairro(b: string): string {
  return b
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function logAddressAttempt(
  clienteId: number,
  requestPayload: unknown,
  responsePayload: unknown,
  viacepResponse: unknown,
  warningCode: string | null,
) {
  database
    .query({
      text: `INSERT INTO bot_address_log
             (cliente_id, request_payload, response_payload, viacep_response, warning_code)
             VALUES ($1, $2, $3, $4, $5)`,
      values: [
        clienteId,
        JSON.stringify(requestPayload),
        JSON.stringify(responsePayload),
        viacepResponse ? JSON.stringify(viacepResponse) : null,
        warningCode,
      ],
    })
    .catch((err: unknown) => {
      console.warn("[bot/enderecos] failed to log address attempt:", (err as Error).message);
    });
}

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }

  const parsed = BotEnderecoSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }

  const data = parsed.data;

  console.info(
    "[bot/enderecos] payload",
    sanitizeForBotLogs({
      cliente_id: data.cliente_id,
      logradouro: data.logradouro,
      bairro: data.bairro,
      cep: data.cep,
    })
  );

  let viacepResult: Awaited<ReturnType<typeof consultarCep>> = null;
  let viacepUnavailable = false;

  try {
    viacepResult = await consultarCep(data.cep);
  } catch {
    viacepUnavailable = true;
  }

  if (!viacepResult && !viacepUnavailable) {
    const responsePayload = { error: "CEP invalido ou nao encontrado", code: "CEP_INVALID" };
    logAddressAttempt(data.cliente_id, data, responsePayload, null, "CEP_INVALID");
    res.status(400).json(responsePayload);
    return;
  }

  let warning: BairroWarning | undefined;

  if (viacepUnavailable) {
    warning = {
      code: "VIACEP_UNAVAILABLE",
      message: "Nao foi possivel validar o CEP no momento. O endereco foi cadastrado normalmente.",
    };
  } else if (viacepResult) {
    const clientBairro = normalizeBairro(data.bairro);
    const cepBairro = normalizeBairro(viacepResult.bairro);
    if (cepBairro && clientBairro !== cepBairro) {
      warning = {
        code: "BAIRRO_SUGGESTION",
        message: `O CEP ${data.cep.trim()} corresponde ao bairro ${viacepResult.bairro}, mas voce informou ${data.bairro.trim()}.`,
      };
    }
  }

  try {
    const clientRow = await database.query({
      text: `SELECT id FROM entities WHERE id = $1 AND entity_type = 'PF'`,
      values: [data.cliente_id],
    });
    if (!clientRow.rows.length) {
      const responsePayload = { error: "Cliente nao encontrado" };
      logAddressAttempt(data.cliente_id, data, responsePayload, viacepResult, null);
      res.status(404).json(responsePayload);
      return;
    }

    const enderecoPayload = JSON.stringify({
      logradouro: data.logradouro.trim(),
      numero: data.numero.trim(),
      complemento: data.complemento?.trim() ?? "",
      bairro: data.bairro.trim(),
      cidade: data.cidade.trim(),
      uf: data.uf.trim().toUpperCase(),
      cep: data.cep.trim(),
    });

    await database.query({
      text: `UPDATE entities
             SET cep = $1, numero = $2, observacao = $3, updated_at = NOW()
             WHERE id = $4`,
      values: [data.cep.trim(), data.numero.trim(), `BOT_ADDR::${enderecoPayload}`, data.cliente_id],
    });

    const responsePayload: Record<string, unknown> = {
      id: data.cliente_id,
      cliente_id: data.cliente_id,
      logradouro: data.logradouro.trim(),
      numero: data.numero.trim(),
      complemento: data.complemento?.trim() ?? "",
      bairro: data.bairro.trim(),
      cidade: data.cidade.trim(),
      uf: data.uf.trim().toUpperCase(),
      cep: data.cep.trim(),
    };

    if (warning) {
      responsePayload.warning = warning;
    }

    logAddressAttempt(data.cliente_id, data, responsePayload, viacepResult, warning?.code ?? null);
    res.status(200).json(responsePayload);
  } catch (error) {
    console.error("[bot/enderecos] error", error);
    res.status(500).json({ error: "Internal error" });
  }
}
