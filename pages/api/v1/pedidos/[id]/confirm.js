// pages/api/v1/pedidos/[id]/confirm.js
export default async function handler(req, res) {
  // Endpoint removido no fluxo CRUD sem rascunhos
  return res.status(410).json({ error: "Endpoint removido: pedidos já nascem confirmados" });
}
