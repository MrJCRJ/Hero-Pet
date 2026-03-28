import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedisData: Record<string, unknown> = {};

vi.mock("@/lib/redis", () => ({
  getRedis: vi.fn(() => ({
    scan: vi.fn(async (cursor: string) => {
      if (cursor === "0") {
        return ["0", Object.keys(mockRedisData)];
      }
      return ["0", []];
    }),
    type: vi.fn(async (key: string) => {
      const val = mockRedisData[key];
      if (typeof val === "string") return "string";
      if (Array.isArray(val)) return "list";
      return "string";
    }),
    get: vi.fn(async (key: string) => mockRedisData[key] ?? null),
    lrange: vi.fn(async (key: string) => mockRedisData[key] ?? []),
    hgetall: vi.fn(async () => ({})),
  })),
  isRedisAvailable: vi.fn(() => true),
}));

function createRes() {
  const res: Record<string, unknown> = {};
  res.statusCode = 0;
  res.body = null;
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((data: unknown) => {
    res.body = data;
  });
  return res as { statusCode: number; body: unknown; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe("GET /api/admin/bot/messages handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(mockRedisData)) delete mockRedisData[k];
  });

  it("returns 405 for non-GET", async () => {
    const handler = (await import("@/server/api/admin/bot/messages")).default;
    const res = createRes();
    await handler({ method: "POST" }, res as never);
    expect(res.statusCode).toBe(405);
  });

  it("returns 503 when Redis is not available", async () => {
    const { isRedisAvailable } = await import("@/lib/redis");
    (isRedisAvailable as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const handler = (await import("@/server/api/admin/bot/messages")).default;
    const res = createRes();
    await handler({ method: "GET", query: {} }, res as never);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual(
      expect.objectContaining({ code: "REDIS_UNAVAILABLE" }),
    );

    (isRedisAvailable as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  it("returns empty messages when no history keys exist", async () => {
    const handler = (await import("@/server/api/admin/bot/messages")).default;
    const res = createRes();
    await handler({ method: "GET", query: {} }, res as never);
    expect(res.statusCode).toBe(200);
    const body = res.body as { messages: unknown[]; total: number };
    expect(body.messages).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("returns parsed messages from Redis string keys", async () => {
    mockRedisData["heropet-bot:ai:history:5575999991234"] = JSON.stringify([
      { role: "user", content: "Oi", timestamp: "2025-01-01T10:00:00Z" },
      { role: "assistant", content: "Ola!", timestamp: "2025-01-01T10:00:01Z" },
    ]);

    const handler = (await import("@/server/api/admin/bot/messages")).default;
    const res = createRes();
    await handler({ method: "GET", query: {} }, res as never);
    expect(res.statusCode).toBe(200);
    const body = res.body as { messages: { phone: string; direction: string; content: string }[]; total: number };
    expect(body.total).toBe(2);
    expect(body.messages[0].direction).toBe("out");
    expect(body.messages[1].direction).toBe("in");
    expect(body.messages[0].phone).toMatch(/\*\*\*\*/);
  });

  it("supports phone filter", async () => {
    mockRedisData["heropet-bot:ai:history:5575999991234"] = JSON.stringify([
      { role: "user", content: "Oi", timestamp: "2025-01-01T10:00:00Z" },
    ]);
    mockRedisData["heropet-bot:ai:history:5575888884321"] = JSON.stringify([
      { role: "user", content: "Ola", timestamp: "2025-01-01T10:00:00Z" },
    ]);

    const handler = (await import("@/server/api/admin/bot/messages")).default;
    const res = createRes();
    await handler({ method: "GET", query: { phone: "1234" } }, res as never);
    expect(res.statusCode).toBe(200);
    const body = res.body as { messages: unknown[]; total: number };
    expect(body.total).toBe(1);
  });

  it("supports pagination with limit and offset", async () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({
      role: "user",
      content: `Message ${i}`,
      timestamp: `2025-01-01T10:00:0${i}Z`,
    }));
    mockRedisData["heropet-bot:ai:history:5575999991234"] = JSON.stringify(entries);

    const handler = (await import("@/server/api/admin/bot/messages")).default;
    const res = createRes();
    await handler({ method: "GET", query: { limit: "2", offset: "1" } }, res as never);
    expect(res.statusCode).toBe(200);
    const body = res.body as { messages: unknown[]; total: number; limit: number; offset: number };
    expect(body.total).toBe(5);
    expect(body.messages.length).toBe(2);
    expect(body.limit).toBe(2);
    expect(body.offset).toBe(1);
  });
});
