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
      className={`btn ${variantClass} ${sizeClass} ${widthClass} ${className}`}
      {...props}
    >
      {Icon && <Icon className="mr-1 w-4 h-4" />}
      {children}
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
