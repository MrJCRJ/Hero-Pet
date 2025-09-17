/** @jest-environment node */

// Verifica que telefone fixo válido + email válido => contact_fill 'completo'

const BASE = "http://localhost:3000/api/v1/entities";

async function create(data) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: (data.name || "teste").toUpperCase(),
      entity_type: "PF",
      document_digits: "", // evitar índice único
      ...data,
    }),
  });
  const body = await res.json();
  if (!res.ok)
    throw new Error(
      "Falha criar entidade: " + res.status + " " + JSON.stringify(body),
    );
  return body;
}

describe("contact_fill completo (telefone fixo + email)", () => {
  beforeAll(async () => {
    // Telefone fixo válido: DDD 11 + número iniciando 2-9 (ex: 23456789) => 1123456789
    await create({
      name: "contato_completo",
      telefone: "1123456789",
      email: "user@example.com",
    });
  });

  test("Registro classificado como completo em contact_fill", async () => {
    const res = await fetch(`${BASE}?contact_fill=completo&limit=50`);
    const json = await res.json();
    const rows = Array.isArray(json) ? json : json.data;
    const match = rows.find((r) => r.name === "CONTATO_COMPLETO");
    expect(res.status).toBe(200);
    expect(match).toBeTruthy();
    expect(match.contact_fill).toBe("completo");
  });
});
