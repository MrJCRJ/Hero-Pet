// components/ui/Button.js
import React from "react";

const buttonStyles = {
  variants: {
    primary: "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] ",
    secondary:
      "bg-[var(--color-accent-cancel)] hover:bg-[var(--color-accent-cancel-hover)]",
  },
  sizes: {
    sm: "px-3 py-1.5 text-sm",
  },
  base: "items-center rounded-md font-semibold ",
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
  const widthClass = fullWidth ? "w-full" : "inline-flex";
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${buttonStyles.base} ${buttonStyles.variants[variant]} ${buttonStyles.sizes[size]} ${widthClass} ${className}`}
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
      <Button variant="secondary" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button variant="primary" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  </div>
);
