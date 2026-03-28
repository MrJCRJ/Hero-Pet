import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedisInstance = {
  get: vi.fn(),
  scan: vi.fn(async () => ["0", [] as string[]]),
};

vi.mock("@/lib/redis", () => ({
  getRedis: vi.fn(() => mockRedisInstance),
  isRedisAvailable: vi.fn(() => true),
}));

vi.mock("infra/database", () => ({
  default: {
    query: vi.fn().mockResolvedValue({
      rows: [
        {
          pedidos_hoje: 5,
          total_hoje: 150.0,
          pedidos_em_andamento: 2,
          ultima_mensagem: "2025-06-01T12:00:00Z",
        },
      ],
    }),
  },
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

describe("GET /api/admin/bot/stats handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisInstance.get = vi.fn();
    mockRedisInstance.scan = vi.fn(async () => ["0", [] as string[]]);
  });

  it("returns 405 for non-GET", async () => {
    const handler = (await import("@/server/api/admin/bot/stats")).default;
    const res = createRes();
    await handler({ method: "POST" }, res as never);
    expect(res.statusCode).toBe(405);
  });

  it("returns consolidated stats with heartbeat connected", async () => {
    mockRedisInstance.get.mockResolvedValue(String(Date.now() - 10_000));

    const handler = (await import("@/server/api/admin/bot/stats")).default;
    const res = createRes();
    await handler({ method: "GET", query: {} }, res as never);
    expect(res.statusCode).toBe(200);

    const body = res.body as {
      bot: { conectado: boolean; redis_disponivel: boolean };
      pedidos: { pedidos_hoje: number };
    };
    expect(body.bot.conectado).toBe(true);
    expect(body.bot.redis_disponivel).toBe(true);
    expect(body.pedidos.pedidos_hoje).toBe(5);
  });

  it("reports disconnected when heartbeat is old", async () => {
    mockRedisInstance.get.mockResolvedValue(String(Date.now() - 300_000));

    const handler = (await import("@/server/api/admin/bot/stats")).default;
    const res = createRes();
    await handler({ method: "GET", query: {} }, res as never);
    expect(res.statusCode).toBe(200);

    const body = res.body as { bot: { conectado: boolean } };
    expect(body.bot.conectado).toBe(false);
  });

  it("reports null connectivity when Redis is unavailable", async () => {
    const { getRedis } = await import("@/lib/redis");
    (getRedis as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const handler = (await import("@/server/api/admin/bot/stats")).default;
    const res = createRes();
    await handler({ method: "GET", query: {} }, res as never);
    expect(res.statusCode).toBe(200);

    const body = res.body as { bot: { conectado: boolean | null; redis_disponivel: boolean } };
    expect(body.bot.conectado).toBeNull();
    expect(body.bot.redis_disponivel).toBe(false);

    (getRedis as ReturnType<typeof vi.fn>).mockReturnValue(mockRedisInstance);
  });
});
