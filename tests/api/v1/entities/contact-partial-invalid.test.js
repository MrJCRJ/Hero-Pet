/** @jest-environment node */

// Verifica que contato permanece 'parcial' quando existe algum dado inválido (telefone inválido ou email inválido)

const BASE = "http://localhost:3000/api/v1/entities";

async function create(data) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: (data.name || "teste").toUpperCase(),
      entity_type: "PF",
      document_digits: "", // evitar índice
      ...data,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error("Falha criar entidade: " + res.status + " " + JSON.stringify(body));
  return body;
}

describe("contact_fill parcial para dados inválidos", () => {
  let registros = [];
  beforeAll(async () => {
    registros.push(await create({ name: "tel_invalido", telefone: "1199" })); // muito curto (4 dígitos após DDD)
    registros.push(await create({ name: "email_invalido", email: "abc@" })); // email incompleto
    registros.push(await create({ name: "ambos_invalidos", telefone: "1199", email: "abc@" }));
  });

  test("GET sem filtro retorna contact_fill 'parcial' para cada caso", async () => {
    const res = await fetch(`${BASE}?limit=50`);
    const json = await res.json();
    expect(res.status).toBe(200);
    const itens = Array.isArray(json) ? json : json.data;
    const targets = itens.filter(r => ["TEL_INVALIDO", "EMAIL_INVALIDO", "AMBOS_INVALIDOS"].includes(r.name));
    expect(targets.length).toBe(3);
    targets.forEach(r => expect(r.contact_fill).toBe("parcial"));
  });
});
