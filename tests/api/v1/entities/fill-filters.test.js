/** @jest-environment node */

// Testa filtros address_fill/contact_fill e a classificação retornada pelo endpoint
// Cria várias entidades com combinações de endereço/contato

const BASE = "http://localhost:3000/api/v1/entities";

async function post(entity) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entity),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error("POST falhou: " + res.status + " " + JSON.stringify(body));
  }
  return body;
}

// Para este teste, não precisamos validar status de documento; podemos usar document_digits vazio
// para evitar colisões em índice único. (document_digits <> '' index condicional)

describe("/api/v1/entities filtros de completude", () => {
  let created = [];
  beforeAll(async () => {
    const fixtures = [
      { name: "ADDR_EMPTY_CONTACT_EMPTY", data: {} },
      { name: "ADDR_FULL_CONTACT_EMPTY", data: { cep: "12345678", numero: "10" } },
      { name: "ADDR_EMPTY_CONTACT_TEL_INVALID", data: { telefone: "119999" } },
      { name: "ADDR_FULL_CONTACT_TEL_VALID", data: { cep: "12345678", numero: "20", telefone: "11987654321" } },
      { name: "ADDR_CEP_ONLY_CONTACT_EMAIL", data: { cep: "12345678", email: "a@b.com" } },
    ];
    for (const f of fixtures) {
      const body = await post({
        name: f.name,
        entity_type: "PF",
        document_digits: "", // evita índice
        ...f.data,
      });
      created.push(body);
    }
  });

  test("Filtro address_fill=vazio retorna somente registros classificados como vazio", async () => {
    const res = await fetch(`${BASE}?address_fill=vazio`);
    expect(res.status).toBe(200);
    const json = await res.json();
    const rows = Array.isArray(json) ? json : json.data;
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach(r => expect(r.address_fill).toBe("vazio"));
  });

  test("Filtro address_fill=completo retorna somente completo", async () => {
    const res = await fetch(`${BASE}?address_fill=completo`);
    const json = await res.json();
    expect(res.status).toBe(200);
    const rows = Array.isArray(json) ? json : json.data;
    rows.forEach(r => expect(r.address_fill).toBe("completo"));
  });

  test("Filtro contact_fill=parcial retorna somente parcial", async () => {
    const res = await fetch(`${BASE}?contact_fill=parcial&limit=50`);
    const json = await res.json();
    expect(res.status).toBe(200);
    const rows = Array.isArray(json) ? json : json.data;
    rows.forEach(r => expect(r.contact_fill).toBe("parcial"));
  });

  test("Filtro contact_fill=completo retorna somente completo", async () => {
    const res = await fetch(`${BASE}?contact_fill=completo&limit=50`);
    const json = await res.json();
    expect(res.status).toBe(200);
    const rows = Array.isArray(json) ? json : json.data;
    rows.forEach(r => expect(r.contact_fill).toBe("completo"));
  });

  test("Combinação de filtros address_fill=vazio&contact_fill=completo retorna interseção", async () => {
    const res = await fetch(`${BASE}?address_fill=vazio&contact_fill=completo&limit=50`);
    const json = await res.json();
    expect(res.status).toBe(200);
    const rows = Array.isArray(json) ? json : json.data;
    rows.forEach(r => {
      expect(r.address_fill).toBe("vazio");
      expect(r.contact_fill).toBe("completo");
    });
  });
});
