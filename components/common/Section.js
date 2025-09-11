// 🔹 Componente de seção dentro do card
export const Section = ({ title, children }) => (
  <div className="mt-2 pt-2 border-t border-dashed">
    <h3 className="text-xs font-medium text-gray-500 mb-1">{title}</h3>
    {children}
  </div>
);
