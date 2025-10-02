import React from 'react';
import OrdersRow from 'components/pedidos/orders/OrdersRow';

// Reusa OrdersRow por enquanto; futuro: extrair subcomponentes específicos
export default function PedidoListRow(props) {
  return <OrdersRow {...props} />;
}
