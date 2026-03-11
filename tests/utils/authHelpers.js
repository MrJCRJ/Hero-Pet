/**
 * Helpers para autenticação em testes de integração.
 * Obtém cookie de sessão via login NextAuth (CSRF + credentials).
 *
 * Uso:
 *   const cookie = await getAuthCookie();
 *   fetch(url, { headers: { Cookie: cookie } });
 */

const BASE_URL =
  process.env.TEST_BASE_URL || "http://localhost:3000";
const TEST_EMAIL =
  process.env.TEST_USER_EMAIL || "admin@hero-pet.local";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "admin123";

/**
 * Garante que existe um usuário admin para testes.
 * Se GET /api/v1/setup indicar setupNeeded, cria via POST.
 */
async function ensureTestUser() {
  const getRes = await fetch(`${BASE_URL}/api/v1/setup`);
  const getData = await getRes.json();
  if (!getData.setupNeeded) return;

  const postRes = await fetch(`${BASE_URL}/api/v1/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Admin Test",
      email: TEST_EMAIL,
      senha: TEST_PASSWORD,
    }),
  });
  if (!postRes.ok) {
    const err = await postRes.text();
    throw new Error(`Setup failed: ${postRes.status} ${err}`);
  }
}

/**
 * Faz login via NextAuth e retorna o header Cookie para requisições subsequentes.
 * Usa CSRF + POST /api/auth/callback/credentials (form-urlencoded).
 *
 * @returns {Promise<string>} Header "Cookie: ..." para usar em fetch
 */
async function getAuthCookie(email = TEST_EMAIL, password = TEST_PASSWORD) {
  const cookies = [];

  // 1) GET CSRF - captura cookie csrf
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, {
    redirect: "manual",
    credentials: "include",
  });
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData?.csrfToken;
  if (!csrfToken) {
    throw new Error("Could not get CSRF token");
  }

  const setCookie = csrfRes.headers.getSetCookie?.();
  if (setCookie && Array.isArray(setCookie)) {
    for (const c of setCookie) {
      const part = c.split(";")[0].trim();
      if (part) cookies.push(part);
    }
  } else if (csrfRes.headers.get?.("set-cookie")) {
    const val = csrfRes.headers.get("set-cookie");
    if (val) cookies.push(val.split(";")[0].trim());
  }

  const cookieHeader = cookies.length ? cookies.join("; ") : "";

  // 2) POST credentials
  const params = new URLSearchParams({
    email,
    password,
    csrfToken,
    callbackUrl: "/",
  });

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
    },
    body: params.toString(),
    redirect: "manual",
    credentials: "include",
  });

  const loginSetCookie = loginRes.headers.getSetCookie?.();
  if (loginSetCookie && Array.isArray(loginSetCookie)) {
    for (const c of loginSetCookie) {
      const part = c.split(";")[0].trim();
      if (part) cookies.push(part);
    }
  } else if (loginRes.headers.get?.("set-cookie")) {
    const val = loginRes.headers.get("set-cookie");
    if (val) cookies.push(val.split(";")[0].trim());
  }

  const merged = cookies.filter(Boolean).join("; ");
  if (!merged) {
    const loc = loginRes.headers.get("location") || "";
    if (loc.includes("error") || loginRes.status >= 400) {
      const text = await loginRes.text();
      throw new Error(
        `Login failed (${loginRes.status}). Location: ${loc}. Body: ${text.slice(0, 200)}`
      );
    }
  }
  return merged;
}

/**
 * Garante usuário e retorna cookie autenticado.
 */
async function getAuthenticatedCookie() {
  await ensureTestUser();
  return getAuthCookie();
}

module.exports = {
  getAuthCookie,
  ensureTestUser,
  getAuthenticatedCookie,
  BASE_URL,
  TEST_EMAIL,
  TEST_PASSWORD,
};
