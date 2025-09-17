/** @jest-environment node */
import http from 'http';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: 'localhost',
        port: 3000,
        path,
        method,
        headers: data
          ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
          }
          : {},
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            const json = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode, json });
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function createEntity(payload) {
  const base = {
    name: 'ACME LTDA',
    entity_type: 'PJ',
    document_digits: '12345678000190',
    document_pending: false,
  };
  return request('POST', '/api/v1/entities', { ...base, ...payload });
}

describe('PUT /api/v1/entities/:id e DELETE', () => {
  test('PUT deve atualizar nome e recalcular status', async () => {
    const created = await createEntity();
    expect(created.status).toBe(201);
    const id = created.json.id;
    const put = await request('PUT', `/api/v1/entities/${id}`, {
      name: 'Nova Razao Social',
      entity_type: 'PJ',
      document_digits: '12345678000190',
      document_pending: false,
    });
    expect(put.status).toBe(200);
    expect(put.json.name).toBe('NOVA RAZAO SOCIAL');
    expect(put.json.document_status).toBeDefined();
  });

  test('PUT deve validar duplicidade de documento', async () => {
    const c1 = await createEntity({ document_digits: '88776655000109' });
    const c2 = await createEntity({ document_digits: '11223344000155' });
    expect(c1.status).toBe(201);
    expect(c2.status).toBe(201);
    const dup = await request('PUT', `/api/v1/entities/${c2.json.id}`, {
      name: 'Teste',
      entity_type: 'PJ',
      document_digits: '88776655000109',
      document_pending: false,
    });
    expect(dup.status).toBe(409);
  });

  test('PUT deve retornar 404 para id inexistente', async () => {
    const res = await request('PUT', '/api/v1/entities/999999', {
      name: 'X',
      entity_type: 'PF',
      document_digits: '',
      document_pending: true,
    });
    expect(res.status).toBe(404);
  });

  test('DELETE deve remover entidade', async () => {
    const created = await createEntity({ document_digits: '' });
    const id = created.json.id;
    const del = await request('DELETE', `/api/v1/entities/${id}`);
    expect(del.status).toBe(200);
    const delAgain = await request('DELETE', `/api/v1/entities/${id}`);
    expect(delAgain.status).toBe(404);
  });
});
