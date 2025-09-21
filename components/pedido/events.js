// Eventos relacionados a estoque/inventário

export function emitInventoryChanged({ productIds, source, orderId }) {
  try {
    if (!Array.isArray(productIds)) return;
    const detail = { productIds, source, orderId };
    const ev = new CustomEvent('inventory-changed', { detail });
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(ev);
    }
  } catch (_) {
    // noop: eventos não devem quebrar o fluxo de UI
  }
}
