import database from "infra/database";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { BotClienteSchema } from "@/server/api/bot/schemas";
import { sanitizeForBotLogs } from "@/server/api/bot/logging";

type BotEndereco = {
  id: number;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
};

function parseEnderecoObservacao(observacao: unknown, fallbackNumero: string, fallbackCep: string): BotEndereco[] {
  if (typeof observacao !== "string" || !observacao.startsWith("BOT_ADDR::")) {
    return [];
  }
  try {
    const parsed = JSON.parse(observacao.slice("BOT_ADDR::".length)) as Omit<BotEndereco, "id">;
    return [
      {
        id: 0,
        logradouro: parsed.logradouro ?? "",
        numero: parsed.numero ?? fallbackNumero ?? "",
        bairro: parsed.bairro ?? "",
        cidade: parsed.cidade ?? "",
        uf: parsed.uf ?? "",
        cep: parsed.cep ?? fallbackCep ?? "",
      },
    ];
  } catch {
    return [];
  }
}

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }

  const parsed = BotClienteSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }

  const telefone = parsed.data.telefone.trim();
  const nome = (parsed.data.nome || "Cliente WhatsApp").trim();
  console.info("[bot/clientes] payload", sanitizeForBotLogs({ telefone, nome }));

  try {
    const existing = await database.query({
      text: `SELECT id, name, telefone, cep, numero, observacao
             FROM entities
             WHERE entity_type = 'PF' AND telefone = $1
             ORDER BY id DESC
             LIMIT 1`,
      values: [telefone],
    });

    if (existing.rows.length) {
      const row = existing.rows[0] as Record<string, unknown>;
      const enderecos = parseEnderecoObservacao(row.observacao, String(row.numero ?? ""), String(row.cep ?? "")).map((e) => ({
        ...e,
        id: Number(row.id),
      }));
      res.status(200).json({
        id: Number(row.id),
        nome: String(row.name ?? nome),
        telefone: String(row.telefone ?? telefone),
        enderecos,
      });
      return;
    }

    const created = await database.query({
      text: `INSERT INTO entities
             (name, entity_type, document_digits, document_status, document_pending, telefone, ativo, created_at, updated_at)
             VALUES ($1, 'PF', '', 'pending', true, $2, true, NOW(), NOW())
             RETURNING id, name, telefone`,
      values: [nome, telefone],
    });

    const row = created.rows[0] as Record<string, unknown>;
    res.status(201).json({
      id: Number(row.id),
      nome: String(row.name ?? nome),
      telefone: String(row.telefone ?? telefone),
      enderecos: [],
    });
  } catch (error) {
    console.error("[bot/clientes] error", error);
    res.status(500).json({ error: "Internal error" });
  }
}
