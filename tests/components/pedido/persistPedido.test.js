import { persistPedido } from 'components/pedido/serviceHelpers';

// Mock dos services internos
jest.mock('components/pedido/service', () => ({
  updateOrder: jest.fn((id, body) => Promise.resolve({ id, ...body })),
  createOrder: jest.fn(body => Promise.resolve({ id: 123, ...body })),
  deleteOrder: jest.fn(id => Promise.resolve({ id, deleted: true })),
}));

import { updateOrder as updateOrderService, createOrder as createOrderService } from 'components/pedido/service';

describe('persistPedido', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  function basePayload(overrides = {}) {
    return {
      itens: [{ produto_id: 1, quantidade: 2, preco_unitario: 10 }],
      promissoria_datas: [],
      ...overrides,
    };
  }

  it('envia frete_total e migrar_fifo quando presentes (COMPRA edit)', async () => {
    const payloadBase = basePayload({ frete_total: 55.4 });
    await persistPedido({
      isEdit: true,
      editingOrderId: 77,
      payloadBase,
      tipo: 'COMPRA',
      partnerId: 9,
      observacao: 'obs',
      partnerName: 'Fornecedor X',
      dataEmissao: '2025-10-02',
      dataEntrega: '2025-10-03',
      temNotaFiscal: true,
      parcelado: true,
      numeroPromissorias: 3,
      dataPrimeiraPromissoria: '2025-11-01',
      migrarFifo: true,
    });
    expect(updateOrderService).toHaveBeenCalledTimes(1);
    const [, body] = updateOrderService.mock.calls[0];
    expect(body.frete_total).toBe(55.4);
    expect(body.migrar_fifo).toBe(true);
  });

  it('não inclui frete_total quando não presente e não inclui migrar_fifo false', async () => {
    const payloadBase = basePayload();
    await persistPedido({
      isEdit: true,
      editingOrderId: 88,
      payloadBase,
      tipo: 'VENDA',
      partnerId: 5,
      observacao: '',
      partnerName: 'Cliente Y',
      dataEmissao: '2025-10-02',
      dataEntrega: null,
      temNotaFiscal: false,
      parcelado: true,
      numeroPromissorias: 1,
      dataPrimeiraPromissoria: null,
      migrarFifo: false,
    });
    const [, body] = updateOrderService.mock.calls[0];
    expect(body.frete_total).toBeUndefined();
    expect(body.migrar_fifo).toBeUndefined();
  });

  it('cria pedido usando payloadBase direto quando isEdit=false', async () => {
    const payloadBase = basePayload({ itens: [{ produto_id: 2, quantidade: 1, preco_unitario: 30 }], frete_total: 10 });
    await persistPedido({
      isEdit: false,
      editingOrderId: null,
      payloadBase,
      tipo: 'VENDA',
      partnerId: 10,
      observacao: 'nova venda',
      partnerName: 'Cliente Z',
      dataEmissao: '2025-10-02',
      dataEntrega: null,
      temNotaFiscal: true,
      parcelado: true,
      numeroPromissorias: 2,
      dataPrimeiraPromissoria: '2025-10-15',
      migrarFifo: false,
    });
    expect(createOrderService).toHaveBeenCalledTimes(1);
    const [body] = createOrderService.mock.calls[0];
    expect(body.frete_total).toBe(10); // create usa spread do payloadBase
    expect(body.tipo).toBe('VENDA');
  });
});
