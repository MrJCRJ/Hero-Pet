// components/ui/Button.js
import React from "react";

// Estilos base do botão usando Tailwind + variáveis CSS
const baseStyles = "inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

// Variants usando as variáveis CSS refatoradas
const variants = {
  primary: "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]  shadow-sm",
  secondary: "bg-[var(--color-accent-cancel)] hover:bg-[var(--color-accent-cancel-hover)] ",
  outline: "border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-bg-secondary)] ",
  ghost: "hover:bg-[var(--color-bg-secondary)] ",
};

// Tamanhos simplificados
const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = ({
  variant = "primary",
  size = "sm",
  fullWidth = true,
  icon: Icon,
  loading = false,
  children,
  onClick,
  type = "button",
  className = "",
  ...props
}) => {
  const classes = [
    baseStyles,
    variants[variant] || variants.primary,
    sizes[size] || sizes.sm,
    fullWidth ? "w-full" : "",
    loading ? "pointer-events-none relative" : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <button
      type={type}
      onClick={onClick}
      aria-busy={loading ? "true" : undefined}
      disabled={props.disabled || loading}
      className={classes}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 text-current mr-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          role="status"
          aria-label="carregando"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {!loading && Icon && <Icon className="w-4 h-4 mr-2" />}
      <span className={loading ? "opacity-70" : ""}>{children}</span>
    </button>
  );
};

// Componente de confirmação genérico
export const ConfirmDialog = ({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
}) => (
  <div className="absolute right-0 top-full mt-2 w-48 p-3 rounded-md shadow-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
    <p className="mb-3 text-center text-sm text-[var(--color-text-primary)]">{message}</p>
    <div className="flex gap-2">
      <Button variant="outline" onClick={onCancel} fullWidth={false} size="sm">
        {cancelLabel}
      </Button>
      <Button variant="primary" onClick={onConfirm} fullWidth={false} size="sm">
        {confirmLabel}
      </Button>
    </div>
  </div>
);
