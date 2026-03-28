import Redis from "ioredis";

let client: Redis | null = null;
let initAttempted = false;

function buildRedisUrl(): string | null {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  const host = process.env.REDIS_HOST;
  if (!host) return null;
  const port = process.env.REDIS_PORT || "6379";
  const password = process.env.REDIS_PASSWORD;
  return password
    ? `redis://:${password}@${host}:${port}`
    : `redis://${host}:${port}`;
}

/**
 * Returns the singleton Redis client, or `null` when no connection is configured.
 * The client is created lazily on first call and reused thereafter.
 */
export function getRedis(): Redis | null {
  if (client) return client;
  if (initAttempted) return null;

  initAttempted = true;
  const url = buildRedisUrl();
  if (!url) return null;

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: false,
    });

    client.on("error", (err) => {
      console.warn("[redis] connection error:", err.message);
    });

    return client;
  } catch (err) {
    console.warn("[redis] failed to create client:", (err as Error).message);
    return null;
  }
}

export function isRedisAvailable(): boolean {
  return getRedis() !== null;
}
