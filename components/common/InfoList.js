import { Info } from "./Info";

// 🔹 Componente genérico para renderizar Info de um objeto
export const InfoList = ({ data }) =>
  Object.entries(data).map(([label, value]) => (
    <Info key={label} label={label} value={value} />
  ));
