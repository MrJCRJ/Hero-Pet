import React from "react";
import { Modal as BaseModal } from "components/common/Modal";

// Wrapper para compatibilizar API existente (open/footer) com o Modal comum
export function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <BaseModal title={title} onClose={onClose} maxWidth="max-w-lg">
      {children}
      {footer && <div className="mt-3">{footer}</div>}
    </BaseModal>
  );
}
