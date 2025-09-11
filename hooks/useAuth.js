import { useState, useEffect } from "react";

// 🔹 Custom Hook para gerenciar autenticação
export function useAuth() {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [incorrectCode, setIncorrectCode] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("adminAuthenticated") === "true")
      setShowAdminPanel(true);
  }, []);

  const authenticate = (code) => {
    const valid = code === "hero123";
    setShowAdminPanel(valid);
    setIncorrectCode(!valid);
    localStorage.setItem("adminAuthenticated", valid);
  };

  const handleAccessCodeSubmit = (e) => {
    e.preventDefault();
    authenticate(accessCode);
  };

  const handleLogout = () => {
    setShowAdminPanel(false);
    setAccessCode("");
    localStorage.removeItem("adminAuthenticated");
  };

  return {
    showAdminPanel,
    accessCode,
    incorrectCode,
    setAccessCode,
    handleAccessCodeSubmit,
    handleLogout,
  };
}
