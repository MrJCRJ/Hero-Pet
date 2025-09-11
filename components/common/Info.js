// 🔹 Componente de linha de informação
export const Info = ({ label, value }) => (
  <div className="mb-1">
    <span className="font-medium text-gray-500">{label}: </span>
    <span className="font-semibold">{value}</span>
  </div>
);
