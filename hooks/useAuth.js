import { useState, useEffect, useCallback, useMemo } from "react";

// 🔹 Fallback padrão se variável de ambiente não estiver definida
const DEFAULT_ACCESS_CODES = {
  "ic@2025": { name: "Icaro Jonathan" },
  "jose@2025": { name: "José Cicero" },
};

/**
 * Constrói mapa de códigos -> { name } a partir de NEXT_PUBLIC_ADMIN_CODES.
 * Formatos aceitos:
 *  - Objeto: { "codigo1": "Nome", "codigo2": { "name": "Outro" } }
 *  - Array: [ { code: "codigo1", name: "Nome" }, ... ]
 *  - Qualquer erro cai em fallback DEFAULT_ACCESS_CODES
 */
function loadAccessCodesFromEnv() {
  try {
    const raw = process.env.NEXT_PUBLIC_ADMIN_CODES;
    if (!raw) return DEFAULT_ACCESS_CODES;
    const parsed = JSON.parse(raw);
    const map = {};
    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        if (item && typeof item.code === "string" && item.name)
          map[item.code] = { name: item.name };
      });
    } else if (parsed && typeof parsed === "object") {
      Object.entries(parsed).forEach(([code, val]) => {
        if (typeof val === "string") map[code] = { name: val };
        else if (val && typeof val === "object" && val.name)
          map[code] = { name: val.name };
      });
    }
    // Garantir pelo menos um código válido
    return Object.keys(map).length ? map : DEFAULT_ACCESS_CODES;
  } catch (e) {
    console.warn(
      "[Auth] Falha ao parsear NEXT_PUBLIC_ADMIN_CODES, usando fallback.",
      e,
    );
    return DEFAULT_ACCESS_CODES;
  }
}

const STORAGE_KEY = "adminAuthenticated"; // boolean legacy
const STORAGE_USER_KEY = "adminAuthenticatedUser"; // nome do usuário autenticado

// 🔹 Custom Hook para gerenciar autenticação
export function useAuth() {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [incorrectCode, setIncorrectCode] = useState(false);
  const [user, setUser] = useState(null); // { name }
  const [isLoading, setIsLoading] = useState(true);

  // Memo para não reavaliar em cada render
  const ACCESS_CODES = useMemo(() => loadAccessCodesFromEnv(), []);

  // Verificar autenticação ao carregar
  useEffect(() => {
    const isAuthenticated = localStorage.getItem(STORAGE_KEY) === "true";
    const storedUser = localStorage.getItem(STORAGE_USER_KEY);
    if (isAuthenticated) {
      // Compatibilidade legada: se não havia USER salvo (versão anterior), assume "Admin"
      const effectiveName = storedUser || "Admin";
      setUser({ name: effectiveName });
      if (!storedUser) {
        // Persistir para não repetir fallback depois
        localStorage.setItem(STORAGE_USER_KEY, effectiveName);
      }
      setShowAdminPanel(true);
    } else {
      setShowAdminPanel(false);
    }
    setIsLoading(false);
  }, []);

  const authenticate = useCallback(
    (code) => {
      const entry = ACCESS_CODES[code];
      const isValid = !!entry;
      setShowAdminPanel(isValid);
      setIncorrectCode(!isValid);
      localStorage.setItem(STORAGE_KEY, isValid);
      if (isValid) {
        setUser({ name: entry.name });
        localStorage.setItem(STORAGE_USER_KEY, entry.name);
      } else {
        setUser(null);
        localStorage.removeItem(STORAGE_USER_KEY);
      }
      return isValid;
    },
    [ACCESS_CODES],
  );

  const handleAccessCodeSubmit = useCallback(
    (e) => {
      e.preventDefault();
      authenticate(accessCode);
    },
    [accessCode, authenticate],
  );

  const handleLogout = useCallback(() => {
    setShowAdminPanel(false);
    setAccessCode("");
    setIncorrectCode(false);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
  }, []);

  return {
    showAdminPanel,
    accessCode,
    incorrectCode,
    isLoading,
    user,
    setAccessCode,
    handleAccessCodeSubmit,
    handleLogout,
    authenticate,
  };
}
