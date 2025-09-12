// 🔹 Componente de Card genérico
export function Card({ title, status, children }) {
  const statusColors = {
    healthy: "bg-green-100 text-green-600",
    error: "bg-red-100 text-red-600",
  };

  return (
    <div className="bg-white rounded-lg shadow p-3 text-sm">
      <h2 className="flex justify-between items-center mb-2 border-b pb-1 text-sm font-semibold">
        {title}
        {status && (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[status] || ""}`}
          >
            {status === "healthy" ? "Healthy" : "Error"}
          </span>
        )}
      </h2>
      <div>{children}</div>
    </div>
  );
}
