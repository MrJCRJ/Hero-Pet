import { describe, it, expect, vi, beforeEach } from "vitest";
import { withPagesHandler } from "@/lib/server/withPagesHandler";

describe("withPagesHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converte GET com JSON para Response", async () => {
    const handler = vi.fn(async (req, res) => {
      expect(req.method).toBe("GET");
      expect(req.query).toEqual({ foo: "bar" });
      res.status(200).json({ ok: true });
    });

    const route = withPagesHandler(handler);
    const request = new Request("http://localhost/api?foo=bar", {
      method: "GET",
    });
    const response = await route(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("converte POST com body para req.body", async () => {
    const handler = vi.fn(async (req, res) => {
      expect(req.method).toBe("POST");
      expect(req.body).toEqual({ name: "test" });
      res.status(201).json({ id: 1 });
    });

    const route = withPagesHandler(handler);
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });
    const response = await route(request);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 1 });
  });

  it("propaga params dinâmicos em context", async () => {
    const handler = vi.fn(async (req, res) => {
      expect(req.query.id).toBe("42");
      res.status(200).json({ id: req.query.id });
    });

    const route = withPagesHandler(handler);
    const request = new Request("http://localhost/api/entities/42");
    const context = { params: Promise.resolve({ id: "42" }) };
    const response = await route(request, context);

    expect(await response.json()).toEqual({ id: "42" });
  });

  it("retorna 500 quando handler não envia resposta", async () => {
    const handler = vi.fn(async () => {
      // não chama res.json() nem res.end()
    });

    const route = withPagesHandler(handler);
    const request = new Request("http://localhost/api", { method: "GET" });
    const response = await route(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toContain("did not send");
  });
});
