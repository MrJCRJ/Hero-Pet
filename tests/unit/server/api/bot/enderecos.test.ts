import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("infra/database", () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

vi.mock("@/lib/viacep", () => ({
  consultarCep: vi.fn(),
}));

vi.mock("@/server/api/bot/logging", () => ({
  sanitizeForBotLogs: vi.fn((x: unknown) => x),
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

describe("POST /api/bot/enderecos handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 405 for non-POST methods", async () => {
    const handler = (await import("@/server/api/bot/enderecos/index")).default;
    const res = createRes();
    await handler({ method: "GET" }, res as never);
    expect(res.statusCode).toBe(405);
  });

  it("returns 400 for invalid payload", async () => {
    const handler = (await import("@/server/api/bot/enderecos/index")).default;
    const res = createRes();
    await handler({ method: "POST", body: {} }, res as never);
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when ViaCEP says CEP is invalid", async () => {
    const { consultarCep } = await import("@/lib/viacep");
    (consultarCep as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const handler = (await import("@/server/api/bot/enderecos/index")).default;
    const res = createRes();
    await handler(
      {
        method: "POST",
        body: {
          cliente_id: 1,
          logradouro: "Rua A",
          numero: "100",
          bairro: "Centro",
          cidade: "Cidade",
          uf: "SP",
          cep: "00000000",
        },
      },
      res as never,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({ code: "CEP_INVALID" }),
    );
  });

  it("accepts address with BAIRRO_SUGGESTION warning when bairro differs", async () => {
    const { consultarCep } = await import("@/lib/viacep");
    (consultarCep as ReturnType<typeof vi.fn>).mockResolvedValue({
      cep: "01001-000",
      logradouro: "Praça da Sé",
      bairro: "Sé",
      localidade: "São Paulo",
      uf: "SP",
    });

    const database = (await import("infra/database")).default;
    (database.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rows: [] });

    const handler = (await import("@/server/api/bot/enderecos/index")).default;
    const res = createRes();
    await handler(
      {
        method: "POST",
        body: {
          cliente_id: 1,
          logradouro: "Rua A",
          numero: "100",
          bairro: "Outro Bairro",
          cidade: "São Paulo",
          uf: "SP",
          cep: "01001000",
        },
      },
      res as never,
    );

    expect(res.statusCode).toBe(200);
    expect((res.body as Record<string, unknown>).bairro).toBe("Outro Bairro");
    expect((res.body as Record<string, unknown>).warning).toEqual(
      expect.objectContaining({ code: "BAIRRO_SUGGESTION" }),
    );
  });

  it("accepts address with VIACEP_UNAVAILABLE warning when ViaCEP is down", async () => {
    const { consultarCep } = await import("@/lib/viacep");
    (consultarCep as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("ViaCEP unavailable: timeout"),
    );

    const database = (await import("infra/database")).default;
    (database.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rows: [] });

    const handler = (await import("@/server/api/bot/enderecos/index")).default;
    const res = createRes();
    await handler(
      {
        method: "POST",
        body: {
          cliente_id: 1,
          logradouro: "Rua A",
          numero: "100",
          bairro: "Centro",
          cidade: "São Paulo",
          uf: "SP",
          cep: "01001000",
        },
      },
      res as never,
    );

    expect(res.statusCode).toBe(200);
    expect((res.body as Record<string, unknown>).warning).toEqual(
      expect.objectContaining({ code: "VIACEP_UNAVAILABLE" }),
    );
  });

  it("returns 200 without warning when bairro matches ViaCEP", async () => {
    const { consultarCep } = await import("@/lib/viacep");
    (consultarCep as ReturnType<typeof vi.fn>).mockResolvedValue({
      cep: "01001-000",
      logradouro: "Praça da Sé",
      bairro: "Centro",
      localidade: "São Paulo",
      uf: "SP",
    });

    const database = (await import("infra/database")).default;
    (database.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rows: [] });

    const handler = (await import("@/server/api/bot/enderecos/index")).default;
    const res = createRes();
    await handler(
      {
        method: "POST",
        body: {
          cliente_id: 1,
          logradouro: "Rua A",
          numero: "100",
          bairro: "Centro",
          cidade: "São Paulo",
          uf: "SP",
          cep: "01001000",
        },
      },
      res as never,
    );

    expect(res.statusCode).toBe(200);
    expect((res.body as Record<string, unknown>).warning).toBeUndefined();
  });
});
