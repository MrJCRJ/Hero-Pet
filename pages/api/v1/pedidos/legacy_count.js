// Endpoint descomissionado: mantido apenas para evitar 404 em clientes antigos.
// Retorna 410 GONE indicando que a métrica legacy_count foi removida.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  return res.status(410).json({
    error: "legacy_count deprecated",
    message:
      "A contagem de pedidos legacy foi removida após retirada da migração FIFO",
  });
}
