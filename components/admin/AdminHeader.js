import { useState } from "react";
import { Button, ConfirmDialog } from "../ui/Button";

// Exemplo de ícone genérico
const LogoutIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`w-4 h-4 ${props.className || ""}`}
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 1 1.5 0v3.75a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V5.25a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V9A.75.75 0 0 1 15 9V5.25a1.5 1.5 0 0 0-1.5-1.5h-6Zm5.03 4.72a.75.75 0 0 1 0 1.06l-1.72 1.72h10.94a.75.75 0 0 1 0 1.5H10.81l1.72 1.72a.75.75 0 1 1-1.06 1.06l-3-3a.75.75 0 0 1 0-1.06l3-3a.75.75 0 0 1 1.06 0Z"
      clipRule="evenodd"
    />
  </svg>
);

export const AdminHeader = ({ onLogout, user, children }) => {
  const [confirming, setConfirming] = useState(false);

  return (
    <header className="flex justify-between">
      <p>{children}</p>

      <div className="flex items-center space-x-4 relative">
        {user && (
          <span>Olá, <span>{user.name}</span></span>
        )}

        <Button
          variant="primary"
          icon={LogoutIcon}
          onClick={() => setConfirming(true)}
        />

        {confirming && (
          <ConfirmDialog
            message="Tem certeza que deseja sair?"
            confirmLabel="Sair"
            cancelLabel="Cancelar"
            onConfirm={onLogout}
            onCancel={() => setConfirming(false)}
          />
        )}
      </div>
    </header>
  );
};

