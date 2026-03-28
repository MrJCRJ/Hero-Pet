import database from "infra/database";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { getRedis } from "@/lib/redis";

const HEARTBEAT_KEY = "heropet-bot:heartbeat";
const HEARTBEAT_TTL_MS = 2 * 60 * 1000; // 2 minutes

async function getBotHeartbeat(): Promise<{
  conectado: boolean | null;
  redis_disponivel: boolean;
  ultima_atividade_bot?: string | null;
}> {
  const redis = getRedis();
  if (!redis) {
    return { conectado: null, redis_disponivel: false };
  }

  try {
    const heartbeat = await redis.get(HEARTBEAT_KEY);
    if (!heartbeat) {
      return { conectado: false, redis_disponivel: true, ultima_atividade_bot: null };
    }
    const ts = Number(heartbeat);
    const age = Date.now() - ts;
    return {
      conectado: age <= HEARTBEAT_TTL_MS,
      redis_disponivel: true,
      ultima_atividade_bot: new Date(ts).toISOString(),
    };
  } catch {
    return { conectado: null, redis_disponivel: false };
  }
}

async function getTotalConversas(): Promise<number | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const keys: string[] = [];
    let cursor = "0";
    let iterations = 0;
    do {
      const [nextCursor, batch] = await redis.scan(cursor, "MATCH", "heropet-bot:ai:history:*", "COUNT", 200);
      cursor = nextCursor;
      keys.push(...batch);
      iterations++;
    } while (cursor !== "0" && iterations < 50);

    const phones = new Set(
      keys.map((k) => {
        const parts = k.split(":");
        return parts[parts.length - 1];
      }),
    );
    return phones.size;
  } catch {
    return null;
  }
}

async function getPedidosStats(): Promise<{
  pedidos_hoje: number;
  receita_hoje: number;
  pedidos_em_andamento: number;
  ultima_mensagem: string | null;
}> {
  const result = await database.query({
    text: `SELECT
             COUNT(*) FILTER (WHERE p.data_emissao::date = CURRENT_DATE) AS pedidos_hoje,
             COALESCE(SUM(CASE WHEN p.data_emissao::date = CURRENT_DATE THEN p.total_liquido END), 0) AS total_hoje,
             COUNT(*) FILTER (WHERE p.status::text IN ('rascunho')) AS pedidos_em_andamento,
             MAX(p.data_emissao) AS ultima_mensagem
           FROM pedidos p
           JOIN entities e ON e.id = p.partner_entity_id
           WHERE p.tipo = 'VENDA'
             AND e.entity_type = 'PF'
             AND COALESCE(e.tipo_cliente, 'pessoa_juridica') = 'pessoa_fisica'
             AND COALESCE(p.observacao::text, '') LIKE '%"origem":"BOT_WHATSAPP"%'`,
    values: [],
  });
  const row = result.rows[0] as Record<string, unknown>;
  return {
    pedidos_hoje: Number(row.pedidos_hoje ?? 0),
    receita_hoje: Number(row.total_hoje ?? 0),
    pedidos_em_andamento: Number(row.pedidos_em_andamento ?? 0),
    ultima_mensagem: row.ultima_mensagem ? String(row.ultima_mensagem) : null,
  };
}

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }

  try {
    const [heartbeat, totalConversas, pedidos] = await Promise.all([
      getBotHeartbeat(),
      getTotalConversas(),
      getPedidosStats(),
    ]);

    res.status(200).json({
      bot: {
        conectado: heartbeat.conectado,
        redis_disponivel: heartbeat.redis_disponivel,
        ultima_atividade_bot: heartbeat.ultima_atividade_bot ?? null,
        total_conversas: totalConversas,
      },
      pedidos: {
        pedidos_hoje: pedidos.pedidos_hoje,
        receita_hoje: pedidos.receita_hoje,
        pedidos_em_andamento: pedidos.pedidos_em_andamento,
        ultima_mensagem: pedidos.ultima_mensagem,
      },
    });
  } catch (error) {
    console.error("[admin/bot/stats] error", error);
    res.status(500).json({ error: "Internal error" });
  }
}
