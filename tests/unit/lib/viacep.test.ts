import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/redis", () => ({
  getRedis: vi.fn(() => null),
  isRedisAvailable: vi.fn(() => false),
}));

const originalFetch = globalThis.fetch;

describe("consultarCep", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.VIACEP_TIMEOUT = "2000";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns ViaCEP data for a valid CEP", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          cep: "01001-000",
          logradouro: "Praça da Sé",
          bairro: "Sé",
          localidade: "São Paulo",
          uf: "SP",
        }),
    });

    const { consultarCep } = await import("@/lib/viacep");
    const result = await consultarCep("01001000");

    expect(result).toEqual({
      cep: "01001-000",
      logradouro: "Praça da Sé",
      bairro: "Sé",
      localidade: "São Paulo",
      uf: "SP",
    });
  });

  it("returns null for an invalid CEP (ViaCEP returns erro: true)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ erro: true }),
    });

    const { consultarCep } = await import("@/lib/viacep");
    const result = await consultarCep("00000000");

    expect(result).toBeNull();
  });

  it("returns null for CEP with wrong format", async () => {
    const { consultarCep } = await import("@/lib/viacep");
    const result = await consultarCep("123");

    expect(result).toBeNull();
  });

  it("throws when ViaCEP is unreachable (network error)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("fetch failed"));

    const { consultarCep } = await import("@/lib/viacep");
    await expect(consultarCep("01001000")).rejects.toThrow("ViaCEP unavailable");
  });

  it("throws when ViaCEP returns HTTP error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { consultarCep } = await import("@/lib/viacep");
    await expect(consultarCep("01001000")).rejects.toThrow("ViaCEP returned HTTP 500");
  });

  it("uses Redis cache when available", async () => {
    const mockGet = vi.fn().mockResolvedValue(
      JSON.stringify({
        cep: "01001-000",
        logradouro: "Praça da Sé",
        bairro: "Sé",
        localidade: "São Paulo",
        uf: "SP",
      }),
    );
    const mockSet = vi.fn().mockResolvedValue("OK");
    const { getRedis } = await import("@/lib/redis");
    (getRedis as ReturnType<typeof vi.fn>).mockReturnValue({
      get: mockGet,
      set: mockSet,
    });

    globalThis.fetch = vi.fn();

    const { consultarCep } = await import("@/lib/viacep");
    const result = await consultarCep("01001000");

    expect(result).toEqual(
      expect.objectContaining({ bairro: "Sé" }),
    );
    expect(mockGet).toHaveBeenCalledWith("viacep:01001000");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
