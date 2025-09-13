import { useState, useEffect, useCallback } from "react";

// 🔹 Constantes para configuração
const ADMIN_ACCESS_CODE = "hero123";
const STORAGE_KEY = "adminAuthenticated";

// 🔹 Custom Hook para gerenciar autenticação
export function useAuth() {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [incorrectCode, setIncorrectCode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar autenticação ao carregar
  useEffect(() => {
    const isAuthenticated = localStorage.getItem(STORAGE_KEY) === "true";
    setShowAdminPanel(isAuthenticated);
    setIsLoading(false);
  }, []);

  const authenticate = useCallback((code) => {
    const isValid = code === ADMIN_ACCESS_CODE;
    setShowAdminPanel(isValid);
    setIncorrectCode(!isValid);
    localStorage.setItem(STORAGE_KEY, isValid);
    return isValid;
  }, []);

  const handleAccessCodeSubmit = useCallback((e) => {
    e.preventDefault();
    authenticate(accessCode);
  }, [accessCode, authenticate]);

  const handleLogout = useCallback(() => {
    setShowAdminPanel(false);
    setAccessCode("");
    setIncorrectCode(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    showAdminPanel,
    accessCode,
    incorrectCode,
    isLoading,
    setAccessCode,
    handleAccessCodeSubmit,
    handleLogout,
    authenticate,
  };
}