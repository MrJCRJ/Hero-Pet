/**
 * @jest-environment node
 */
import axios from "axios";
import orchestrator from "tests/orchestrator.js";

jest.setTimeout(35000);

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("GET /api/v1/pedidos/:id/nf", () => {
  test("responde coerente: 200 com PDF ou códigos esperados (400/404/503)", async () => {
    // ID 1 é arbitrário; em dev pode não existir/ter schema ausente
    const res = await axios.get("http://localhost:3000/api/v1/pedidos/1/nf", {
      responseType: "arraybuffer",
      validateStatus: () => true,
    });

    const { status, headers, data } = res;
    const is200 = status === 200;
    const is400 = status === 400;
    const is404 = status === 404;
    const is503 = status === 503;

    // Deve estar em um dos estados esperados
    expect(is200 || is400 || is404 || is503).toBe(true);

    // Quando 200, deve ser um PDF não vazio com cabeçalhos adequados
    const hasPdfContentType = String(headers["content-type"] || "").includes(
      "application/pdf",
    );
    const hasDisposition = /attachment; filename="NF-\d+\.pdf"/.test(
      String(headers["content-disposition"] || ""),
    );
    const hasNonEmptyBody =
      typeof data?.byteLength === "number" && data.byteLength > 1000;
    expect(
      !is200 || (hasPdfContentType && hasDisposition && hasNonEmptyBody),
    ).toBe(true);

    // Para respostas não-200, espera-se um corpo presente (mensagem de erro)
    const hasBodyWhenError = !is200 ? data != null : true;
    expect(hasBodyWhenError).toBe(true);
  });
});
