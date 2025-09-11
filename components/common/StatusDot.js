// components/common/StatusDot.js

export function StatusDot({ status, className = "" }) {
  const normalized = String(status).toLowerCase();

  const colors = {
    healthy: "bg-green-500 animate-pulse",
    online: "bg-green-500 animate-pulse",
    good: "bg-green-500 animate-pulse",

    degraded: "bg-yellow-500",
    warning: "bg-yellow-500",

    offline: "bg-red-500",
    error: "bg-red-500",
    down: "bg-red-500",
    bad: "bg-red-500",
  };

  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${colors[normalized] || "bg-gray-400"} ${className}`}
      role="status"
      aria-label={`Status: ${normalized}`}
    />
  );
}
