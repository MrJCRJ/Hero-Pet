import { getRedis } from "@/lib/redis";

export interface ViaCepResult {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

const CACHE_TTL_SECONDS = 86_400; // 24 hours
const CACHE_PREFIX = "viacep:";

function timeout(): number {
  return Number(process.env.VIACEP_TIMEOUT) || 3000;
}

/**
 * Queries ViaCEP for the given CEP, with optional Redis cache (TTL 24h).
 * Returns null when the CEP is invalid or the API is unreachable.
 */
export async function consultarCep(cep: string): Promise<ViaCepResult | null> {
  const cleaned = cep.replace(/\D/g, "");
  if (cleaned.length !== 8) return null;

  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get(`${CACHE_PREFIX}${cleaned}`);
      if (cached) return JSON.parse(cached) as ViaCepResult;
    } catch {
      // cache miss — proceed to fetch
    }
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout());

    const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`ViaCEP returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.erro) return null;

    const result: ViaCepResult = {
      cep: data.cep,
      logradouro: data.logradouro ?? "",
      bairro: data.bairro ?? "",
      localidade: data.localidade ?? "",
      uf: data.uf ?? "",
    };

    if (redis) {
      redis
        .set(`${CACHE_PREFIX}${cleaned}`, JSON.stringify(result), "EX", CACHE_TTL_SECONDS)
        .catch(() => {});
    }

    return result;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("ViaCEP returned")) {
      throw err;
    }
    throw new Error(`ViaCEP unavailable: ${(err as Error).message}`);
  }
}
