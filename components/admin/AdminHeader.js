// components/admin/AdminHeader.js
import { useState } from "react";

const LogoutIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-4 h-4"
  >
    <path
      fillRule="evenodd"
      d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5a1.5 1.5 0 0 0 
         1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 
         1 1.5 0v3.75a3 3 0 0 1-3 3h-6a3 3 0 0 
         1-3-3V5.25a3 3 0 0 1 3-3h6a3 3 0 0 
         1 3 3V9A.75.75 0 0 1 15 9V5.25a1.5 1.5 0 0 
         0-1.5-1.5h-6Zm5.03 4.72a.75.75 0 0 1 0 
         1.06l-1.72 1.72h10.94a.75.75 0 0 
         1 0 1.5H10.81l1.72 1.72a.75.75 0 
         1 1-1.06 1.06l-3-3a.75.75 0 
         0 1 0-1.06l3-3a.75.75 0 0 
         1 1.06 0Z"
      clipRule="evenodd"
    />
  </svg>
);

export const AdminHeader = ({ onLogout, user, children }) => {
  const [confirming, setConfirming] = useState(false);

  return (
    <header className="flex justify-between items-center mb-6 p-4 rounded-lg shadow-sm bg-[var(--color-bg-primary)] ">
      {/* Esquerda → título + conteúdo extra (status etc.) */}
      <div className="flex items-center space-x-4">
        <h2 className="text-lg font-semibold">
          {children ? children : "Painel de Status"}
        </h2>
      </div>

      {/* Direita → usuário + logout */}
      <div className="flex items-center space-x-4">
        {user && (
          <span className="text-sm text-[var(--color-text-secondary)]">
            Olá, <span className="font-medium">{user.name}</span>
          </span>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex items-center space-x-1 rounded-md px-3 py-2 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:bg-[var(--color-accent-hover)]"
          >
            <LogoutIcon />
            <span>Sair</span>
          </button>

          {confirming && (
            <div className="absolute right-0 top-full mt-2 w-48 p-3 rounded-md shadow-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)]  z-10">
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                Deseja realmente sair?
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 py-1 text-xs rounded bg-[var(--color-bg-secondary)]  hover:bg-[var(--color-bg-primary)]"
                >
                  Cancelar
                </button>
                <button
                  onClick={onLogout}
                  className="flex-1 py-1 text-xs rounded bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:bg-[var(--color-accent-hover)]"
                >
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
