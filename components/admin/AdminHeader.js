// 🔹 Componente de header do admin
export const AdminHeader = ({ onLogout }) => (
  <div className="flex justify-between items-center mb-3">
    <h2 className="text-base font-semibold">Painel de Status</h2>
    <button
      type="button"
      onClick={onLogout}
      className="bg-red-500 text-white rounded-md px-3 py-1 text-xs font-semibold hover:bg-red-600"
    >
      Sair
    </button>
  </div>
);
