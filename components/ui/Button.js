// components/ui/Button.js
import React from "react";

// Mapeia variants legacy -> classes do plugin
const variantMap = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  outline: 'btn-outline',
  default: 'btn'
};

const sizeMap = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg'
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
  const widthClass = fullWidth ? "btn-block" : "inline-flex";
  const variantClass = variantMap[variant] || variantMap.default;
  const sizeClass = sizeMap[size] || '';
  return (
    <button
      type={type}
      onClick={onClick}
      aria-busy={loading ? 'true' : undefined}
      disabled={props.disabled || loading}
      className={`btn ${variantClass} ${sizeClass} ${widthClass} ${loading ? 'btn-loading' : ''} ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 text-current"
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
      {!loading && Icon && <Icon className="mr-1 w-4 h-4" />}
      <span className={loading ? 'opacity-90' : ''}>{children}</span>
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
  <div className="absolute right-0 top-full mt-2 w-48 p-3 rounded-md shadow-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
    <p className="mb-2 text-center">{message}</p>
    <div className="flex space-x-2">
      <Button variant="secondary" onClick={onCancel} fullWidth={false}>
        {cancelLabel}
      </Button>
      <Button variant="primary" onClick={onConfirm} fullWidth={false}>
        {confirmLabel}
      </Button>
    </div>
  </div>
);
