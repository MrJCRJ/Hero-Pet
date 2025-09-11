// components/admin/AdminHeader.js

import { StatusNav } from "../dashboard/StatusNav";

// 🔹 Componente de header do admin
export const AdminHeader = ({ onLogout, status }) => (
  <div className="flex justify-between items-center mb-3">
    {/* Esquerda → título + status inline */}
    <div className="flex items-center space-x-4">
      <h2 className="text-base font-semibold">Painel de Status</h2>
      <StatusNav status={status} compact />
    </div>

    {/* Direita → botão sair */}
    <button
      type="button"
      onClick={onLogout}
      className="bg-red-500 text-white rounded-md px-3 py-1 text-xs font-semibold hover:bg-red-600"
    >
      Sair
    </button>
  </div>
);
