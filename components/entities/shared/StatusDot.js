// components/common/StatusDot.js

export function StatusDot({ status, className = "" }) {
  const normalized = String(status).toLowerCase();

  const colors = {
    healthy: "bg-green-500 animate-pulse",
    online: "bg-green-500 animate-pulse",
    good: "bg-green-500 animate-pulse",
    valid: "bg-green-500 animate-pulse",

    degraded: "bg-yellow-500 animate-pulse",
    warning: "bg-yellow-500 animate-pulse",
    pending: "bg-yellow-500 animate-pulse",

    provisional: "bg-orange-500 animate-pulse",
    progressing: "bg-orange-500 animate-pulse",

    offline: "bg-red-500 animate-pulse",
    error: "bg-red-500 animate-pulse",
    down: "bg-red-500 animate-pulse",
    bad: "bg-red-500 animate-pulse",
  };

  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${colors[normalized] || "bg-gray-400"} ${className}`}
      role="status"
      aria-label={`Status: ${normalized}`}
    />
  );
}
