import database from "infra/database";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { BotEnderecoSchema } from "@/server/api/bot/schemas";
import { sanitizeForBotLogs } from "@/server/api/bot/logging";

function allowedBairros(): string[] {
  return String(process.env.ALLOWED_BAIRROS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
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
  const allowed = allowedBairros();
  const bairro = data.bairro.trim().toLowerCase();
  if (allowed.length && !allowed.includes(bairro)) {
    res.status(400).json({ error: "Bairro nao permitido" });
    return;
  }

  console.info(
    "[bot/enderecos] payload",
    sanitizeForBotLogs({
      cliente_id: data.cliente_id,
      logradouro: data.logradouro,
      bairro: data.bairro,
      cep: data.cep,
    })
  );

  try {
    const clientRow = await database.query({
      text: `SELECT id FROM entities WHERE id = $1 AND entity_type = 'PF'`,
      values: [data.cliente_id],
    });
    if (!clientRow.rows.length) {
      res.status(404).json({ error: "Cliente nao encontrado" });
      return;
    }

    const enderecoPayload = JSON.stringify({
      logradouro: data.logradouro.trim(),
      numero: data.numero.trim(),
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

    res.status(200).json({
      id: data.cliente_id,
      cliente_id: data.cliente_id,
      logradouro: data.logradouro.trim(),
      numero: data.numero.trim(),
      bairro: data.bairro.trim(),
      cidade: data.cidade.trim(),
      uf: data.uf.trim().toUpperCase(),
      cep: data.cep.trim(),
    });
  } catch (error) {
    console.error("[bot/enderecos] error", error);
    res.status(500).json({ error: "Internal error" });
  }
}
