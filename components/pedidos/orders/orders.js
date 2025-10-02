// Dashboard components
export { default as OrdersDashboard } from "./dashboard/OrdersDashboard";
export { default as DashboardCards } from "./dashboard/DashboardCards";

// Modal components
export { default as InfoModal } from "./modals/InfoModal";
export { default as HelpModal } from "./modals/HelpModal";
export { default as PayPromissoriaModal } from "./modals/PayPromissoriaModal";

// Chart components
export { default as ComprasHistoryChart } from "./charts/ComprasHistoryChart";
export { default as LucroBrutoDetails } from "./charts/LucroBrutoDetails";
export { default as VendasComprasOverlayDetails } from "./charts/VendasComprasOverlayDetails";

// Shared components and utilities
export { default as Card } from "./shared/Card";
export { default as PromissoriasList } from "./shared/PromissoriasList";

// Hooks
export { useMonthState, useDashboardData, usePedidos } from "./shared/hooks";

// Utils and constants
export * from "./shared/utils";
export * from "./shared/constants";

// Legacy exports (components that remained in root)
export { default as FilterBar } from "./FilterBar";
export { default as OrdersHeader } from "./OrdersHeader";
export { default as OrdersPage } from "./OrdersPage";
export { default as OrdersRow } from "./OrdersRow";
export { default as PromissoriasDots } from "./PromissoriasDots";
