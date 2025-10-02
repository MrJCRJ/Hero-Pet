import React from "react";
import {
  THEAD_STICKY,
  THEAD_ROW,
  TH_BASE,
  ACTION_TH,
} from "components/common/tableStyles";

export default function OrdersHeader() {
  return (
    <thead className={THEAD_STICKY}>
      <tr className={THEAD_ROW}>
        <th className={TH_BASE}>Tipo</th>
        <th className={`${TH_BASE} w-[160px] max-w-[160px]`}>Parceiro</th>
        <th className={TH_BASE}>Emissão</th>
        <th className="text-center px-3 py-1.5 font-semibold">NF</th>
        <th
          className="text-center px-3 py-1.5 font-semibold"
          title="Duplicadas"
        >
          Dupl.
        </th>
        <th className="text-right px-3 py-1.5 font-semibold">Total</th>
        <th className="text-center px-3 py-1.5 font-semibold">Parcelas</th>
        <th className={ACTION_TH}>Ações</th>
      </tr>
    </thead>
  );
}
