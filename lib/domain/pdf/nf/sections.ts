// lib/pdf/nf/sections.ts
// Re-exports for backward compatibility. Implementation split into header.ts, items.ts, footer.ts
export {
  box,
  measureKVHeight,
  drawKVInline,
  drawInfoBoxTwoCols,
  drawHeader,
  drawParties,
  drawTransportadora,
} from "./header";
export {
  computeItemColumns,
  drawItemsHeader,
  drawItemsRows,
} from "./items";
export {
  drawTotals,
  drawSignature,
  drawFooter,
} from "./footer";
export type { TransportadoraInfo } from "./types";
