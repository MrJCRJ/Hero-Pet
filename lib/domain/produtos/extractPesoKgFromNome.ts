/**
 * Extrai peso em kg do nome comercial (ex.: "Chanin 10,1Kg", "Igor 25kg").
 * Alinhado à lógica do catálogo do bot.
 */

function parsePesoKgLiteral(token: string): number | null {
  const t = token.trim();
  if (!t) return null;
  let n: number;
  if (t.includes(",") && !t.includes(".")) n = Number(t.replace(",", "."));
  else if (t.includes(".") && t.includes(","))
    n = Number(t.replace(/\./g, "").replace(",", "."));
  else n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function extractPesoKgFromNome(nome: string): number | null {
  const raw = String(nome || "");
  const match = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo|kilos|quilo|quilos)\b/i);
  if (!match) return null;
  return parsePesoKgLiteral(match[1]);
}
