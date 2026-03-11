// Shared types for NF PDF sections
type PDFDoc = import("pdfkit").PDFKit.PDFDocument;
type PedidoLike = Record<string, unknown>;
type RowLike = Record<string, unknown>;
type ColMeta = { key: string; label: string; x: number; w: number; align: string };
type ColsMeta = { left: number; w: number; cols: ColMeta[] };
type HeaderMeta = { yStart: number; box: { left: number; top: number; w: number } };
type TwoColRow = [[string, unknown] | null, [string, unknown] | null];

export interface TransportadoraInfo {
  razao?: string;
  quantidade?: number | string;
  especie?: string;
  cpf?: string;
  pesoB?: string | number;
  placa?: string;
  pesoL?: string | number;
  uf?: string;
}

export type { PDFDoc, PedidoLike, RowLike, ColMeta, ColsMeta, HeaderMeta, TwoColRow };
