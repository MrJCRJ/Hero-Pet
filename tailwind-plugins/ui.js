// tailwind-plugins/ui.js
// Plugin de utilidades para componentes UI padronizados
const plugin = require("tailwindcss/plugin");

module.exports = plugin(function ({ addComponents, addUtilities, theme }) {
  const colors = theme("colors") || {};
  const indigo =
    colors.indigo && colors.indigo[600]
      ? colors.indigo
      : { 600: "#4f46e5", 700: "#4338ca" };
  const accent = "var(--color-accent, " + (indigo[600] || "#4f46e5") + ")";
  const accentHover =
    "var(--color-accent-hover, " + (indigo[700] || "#4338ca") + ")";

  const baseBtn = {
    "@apply inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none":
      {},
    fontSize: ".8125rem",
    lineHeight: "1.1rem",
    padding: ".55rem .9rem",
    gap: ".5rem",
  };

  const buttons = {
    ".btn": Object.assign({}, baseBtn, {
      background: "var(--color-bg-secondary)",
      border: "1px solid var(--color-border)",
      color: "var(--color-text-primary)",
    }),
    ".btn:hover": {
      background: "var(--color-bg-elevated)",
      borderColor: "var(--color-border-strong)",
    },
    ".btn-loading": {
      position: "relative",
      pointerEvents: "none",
    },
    ".btn-loading > svg": {
      marginRight: ".35rem",
    },
    ".btn-primary": Object.assign({}, baseBtn, {
      background: accent,
      color: "#fff",
      boxShadow: "0 1px 2px rgba(0,0,0,.15), 0 1px 1px rgba(0,0,0,.08)",
    }),
    ".btn-primary:hover": { background: accentHover },
    ".btn-secondary": Object.assign({}, baseBtn, {
      background: "var(--color-bg-accent-soft)",
      color: accent,
      border: "1px solid var(--color-border-accent)",
    }),
    ".btn-secondary:hover": { background: "var(--color-bg-muted)" },
    ".btn-danger": Object.assign({}, baseBtn, {
      background: "var(--color-accent-cancel)",
      color: "#fff",
    }),
    ".btn-danger:hover": { background: "var(--color-accent-cancel-hover)" },
    ".btn-outline": Object.assign({}, baseBtn, {
      background: "transparent",
      color: accent,
      border: "1px solid " + accent,
    }),
    ".btn-outline:hover": { background: "rgba(59,130,246,0.08)" },
    ".btn-sm": { padding: ".35rem .6rem", fontSize: ".7rem" },
    ".btn-lg": { padding: ".75rem 1.15rem", fontSize: ".9rem" },
    ".btn-block": { display: "flex", width: "100%" },
  };

  const badges = {
    ".badge": {
      display: "inline-flex",
      alignItems: "center",
      fontWeight: 500,
      fontSize: ".625rem",
      lineHeight: "1",
      padding: ".25rem .5rem",
      borderRadius: "999px",
      letterSpacing: ".5px",
      background: "var(--color-bg-secondary)",
      border: "1px solid var(--color-border)",
      color: "var(--color-text-secondary)",
    },
    ".badge-soft": {
      background: "var(--color-bg-accent-soft)",
      border: "1px solid var(--color-border-accent)",
      color: accent,
    },
    ".badge-success": {
      background: "var(--color-success)",
      border: "1px solid var(--color-success)",
      color: "#fff",
    },
    ".badge-warning": {
      background: "var(--color-warning)",
      border: "1px solid var(--color-warning)",
      color: "#1a1a1a",
    },
    ".badge-info": {
      background: "var(--color-bg-accent-soft)",
      border: "1px solid var(--color-border-accent)",
      color: "var(--color-accent)",
    },
    ".badge-danger": {
      background: "var(--color-accent-cancel)",
      border: "1px solid var(--color-accent-cancel)",
      color: "#fff",
    },
    ".badge-sm": { fontSize: ".55rem", padding: ".2rem .4rem" },
  };

  const surfaces = {
    ".card": {
      background: "var(--color-bg-secondary)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-default)",
      boxShadow: "var(--shadow-form)",
      padding: "1rem",
    },
    ".surface": {
      background: "var(--color-bg-secondary)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-elevated)",
    },
    ".divider": {
      height: "1px",
      width: "100%",
      background:
        "linear-gradient(to right, transparent, var(--color-border) 40%, var(--color-border) 60%, transparent)",
      margin: "1.5rem 0",
    },
  };

  addComponents(buttons);
  addComponents(badges);
  addComponents(surfaces);
  addUtilities({ ".ring-focus": { boxShadow: "var(--shadow-focus)" } }, [
    "focus-visible",
  ]);
});
