// tests/api/v1/status/get.test.js
import axios from 'axios';

// Helper para evitar repetição de request
const getStatus = (queryParams = '') =>
  axios.get(`http://localhost:3000/api/v1/status${queryParams}`);

// Helper para validar timestamp ISO 8601 estrito
const isValidISO8601 = (dateString) => {
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
  if (!isoRegex.test(dateString)) return false;

  const date = new Date(dateString);
  return date.toString() !== 'Invalid Date' && date.toISOString() === dateString;
};

describe('GET /api/v1/status', () => {
  jest.setTimeout(10000);

  test('deve retornar status code 200', async () => {
    const response = await getStatus();
    expect(response.status).toBe(200);
  });

  test('deve retornar resposta no formato JSON', async () => {
    const response = await getStatus();
    expect(response.headers['content-type']).toContain('application/json');
  });

  test('deve ter a estrutura correta de resposta', async () => {
    const { data } = await getStatus();

    expect(data).toHaveProperty('updated_at');
    expect(data).toHaveProperty('dependencies');
    expect(data.dependencies).toHaveProperty('database');

    const { database } = data.dependencies;
    expect(database).toHaveProperty('version');
    expect(database).toHaveProperty('max_connections');
    expect(database).toHaveProperty('current_connections');
  });

  test('deve retornar timestamp ISO 8601 válido em updated_at', async () => {
    const { data } = await getStatus();

    expect(data.updated_at).toBeDefined();
    expect(typeof data.updated_at).toBe('string');
    expect(isValidISO8601(data.updated_at)).toBe(true);

    const parsedDate = new Date(data.updated_at);
    const now = new Date();
    const timeDifference = now - parsedDate;
    expect(timeDifference).toBeLessThan(10000);
  });

  test('deve retornar versão válida do PostgreSQL', async () => {
    const { data } = await getStatus();
    const { version } = data.dependencies.database;

    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
    expect(version).toMatch(/^\d+\.\d+/);

    const versionNumber = parseFloat(version);
    expect(versionNumber).toBeGreaterThanOrEqual(12);
  });

  test('deve retornar valor válido para max_connections', async () => {
    const { data } = await getStatus();
    const { max_connections } = data.dependencies.database;

    expect(max_connections).toBeDefined();
    expect(typeof max_connections).toBe('number');
    expect(max_connections).toBeGreaterThan(0);
  });

  test('deve retornar valor válido para current_connections', async () => {
    const { data } = await getStatus();
    const { current_connections, max_connections } = data.dependencies.database;

    expect(current_connections).toBeDefined();
    expect(typeof current_connections).toBe('number');
    expect(current_connections).toBeGreaterThanOrEqual(0);
    expect(current_connections).toBeLessThanOrEqual(max_connections);
  });

  test('deve responder dentro de um tempo razoável', async () => {
    const startTime = Date.now();
    const response = await getStatus();
    const endTime = Date.now();

    expect(response.status).toBe(200);

    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(5000);
  });

  test('deve ter cabeçalhos CORS apropriados', async () => {
    const response = await getStatus();
    const corsHeader = response.headers['access-control-allow-origin'];

    expect(corsHeader).toBeDefined();
    expect(['*', 'http://localhost:3000', 'https://yourdomain.com']).toContain(
      corsHeader
    );
  });

  test('deve ter cabeçalhos de controle de cache apropriados', async () => {
    const response = await getStatus();
    const cacheControl = response.headers['cache-control'];

    expect(cacheControl).toBeDefined();
    expect(cacheControl).toMatch(/(no-store|no-cache|private)/);
  });
});

describe('GET /api/v1/status - Casos de Borda', () => {
  test('deve lidar com requisições concorrentes', async () => {
    const requests = Array(5).fill().map(() => getStatus());
    const responses = await Promise.all(requests);

    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });

    const responseBodies = responses.map(r => r.data);

    responseBodies.forEach((body) => {
      expect(body).toHaveProperty('updated_at');
      expect(body).toHaveProperty('dependencies');
    });

    const timestamps = responseBodies.map(body => new Date(body.updated_at));
    const timeDifferences = timestamps.map(t => Math.abs(t - timestamps[0]));
    const maxTimeDifference = Math.max(...timeDifferences);

    expect(maxTimeDifference).toBeLessThan(2000);
  });

  test('deve ignorar parâmetros de query não utilizados', async () => {
    const { status, data } = await getStatus('?unused=param&test=value');

    expect(status).toBe(200);
    expect(data).toHaveProperty('updated_at');
  });

  test('deve resistir a parâmetros de query maliciosos', async () => {
    const { status, data } = await getStatus('?sql_injection=1%3BDROP%20TABLE%20users');

    expect(status).toBe(200);
    expect(data).toHaveProperty('updated_at');
  });
});

describe('GET /api/v1/status - Resiliência', () => {
  test('deve manter valores consistentes do banco entre requisições', async () => {
    const [res1, res2] = await Promise.all([getStatus(), getStatus()]);

    const body1 = res1.data;
    const body2 = res2.data;

    expect(body1.dependencies.database.version).toBe(
      body2.dependencies.database.version
    );
    expect(body1.dependencies.database.max_connections).toBe(
      body2.dependencies.database.max_connections
    );

    expect(body1.updated_at).not.toBe(body2.updated_at);
  });
});

// Teste adicional para verificar ambiente
test('deve estar rodando em ambiente de teste ou desenvolvimento', () => {
  expect(['test', 'development']).toContain(process.env.NODE_ENV);
});
