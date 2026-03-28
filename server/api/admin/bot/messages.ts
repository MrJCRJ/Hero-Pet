import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { getRedis, isRedisAvailable } from "@/lib/redis";

const HISTORY_PATTERN = "heropet-bot:ai:history:*";
const MAX_SCAN_KEYS = 1000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const CONTENT_MAX_LENGTH = 500;

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "****";
  const last4 = digits.slice(-4);
  const ddd = digits.length >= 10 ? digits.slice(digits.length - 10, digits.length - 8) : "";
  return `+55 ${ddd} ****-${last4}`;
}

interface ParsedMessage {
  phone: string;
  phoneMasked: string;
  timestamp: string;
  direction: "in" | "out";
  content: string;
}

function parseHistoryEntry(raw: string, phone: string): ParsedMessage[] {
  try {
    const entry = JSON.parse(raw);

    if (Array.isArray(entry)) {
      return entry
        .filter((m: Record<string, unknown>) => m && m.role)
        .map((m: Record<string, unknown>) => ({
          phone,
          phoneMasked: maskPhone(phone),
          timestamp: String(m.timestamp ?? m.created_at ?? new Date().toISOString()),
          direction: (m.role === "user" ? "in" : "out") as "in" | "out",
          content: truncate(String(m.content ?? "")),
        }));
    }

    if (entry && typeof entry === "object" && entry.role) {
      return [
        {
          phone,
          phoneMasked: maskPhone(phone),
          timestamp: String(entry.timestamp ?? entry.created_at ?? new Date().toISOString()),
          direction: (entry.role === "user" ? "in" : "out") as "in" | "out",
          content: truncate(String(entry.content ?? "")),
        },
      ];
    }

    return [];
  } catch {
    return [];
  }
}

function truncate(s: string): string {
  return s.length > CONTENT_MAX_LENGTH ? s.slice(0, CONTENT_MAX_LENGTH) + "..." : s;
}

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }

  if (!isRedisAvailable()) {
    res.status(503).json({
      error: "Funcionalidade indisponivel: Redis nao configurado",
      code: "REDIS_UNAVAILABLE",
    });
    return;
  }

  const redis = getRedis()!;
  const query = req.query ?? {};
  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(Number(query.offset) || 0, 0);
  const phoneFilter = typeof query.phone === "string" ? query.phone.replace(/\D/g, "") : "";
  const dateFrom = typeof query.date_from === "string" ? query.date_from : "";
  const dateTo = typeof query.date_to === "string" ? query.date_to : "";

  try {
    const keys: string[] = [];
    let cursor = "0";
    let iterations = 0;
    do {
      const [nextCursor, batch] = await redis.scan(cursor, "MATCH", HISTORY_PATTERN, "COUNT", 100);
      cursor = nextCursor;
      keys.push(...batch);
      iterations++;
    } while (cursor !== "0" && keys.length < MAX_SCAN_KEYS && iterations < 100);

    let allMessages: ParsedMessage[] = [];

    for (const key of keys) {
      const phone = key.split(":").pop() ?? "";

      if (phoneFilter && !phone.includes(phoneFilter)) continue;

      const type = await redis.type(key);
      let rawEntries: string[] = [];

      if (type === "list") {
        rawEntries = await redis.lrange(key, 0, -1);
      } else if (type === "string") {
        const val = await redis.get(key);
        if (val) rawEntries = [val];
      } else if (type === "hash") {
        const all = await redis.hgetall(key);
        rawEntries = Object.values(all);
      }

      for (const raw of rawEntries) {
        const parsed = parseHistoryEntry(raw, phone);
        allMessages.push(...parsed);
      }
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      allMessages = allMessages.filter((m) => new Date(m.timestamp).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86_400_000;
      allMessages = allMessages.filter((m) => new Date(m.timestamp).getTime() < to);
    }

    allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = allMessages.length;
    const page = allMessages.slice(offset, offset + limit).map((m) => ({
      phone: m.phoneMasked,
      timestamp: m.timestamp,
      direction: m.direction,
      content: m.content,
    }));

    res.status(200).json({ messages: page, total, limit, offset });
  } catch (error) {
    console.error("[admin/bot/messages] error", error);
    res.status(500).json({ error: "Internal error" });
  }
}
