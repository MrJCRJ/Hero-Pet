import { Client } from "pg";

async function query(queryObject) {
  let client;

  try {
    client = await getNewClient();
    const result = await client.query(queryObject);
    return result;
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw error;
  } finally {
    // Só encerra se a conexão foi estabelecida
    if (client) {
      try {
        await client.end();
      } catch (endErr) {
        // log silencioso para não mascarar erro original
        console.warn("Falha ao encerrar conexão PG:", endErr.message);
      }
    }
  }
}

const database = {
  query,
  getNewClient,
};

export default database;

async function getNewClient() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    ssl: getSSLValues(),
  });

  await client.connect();
  return client;
}

function getSSLValues() {
  if (process.env.POSTGRES_CA) {
    return {
      ca: process.env.POSTGRES_CA,
    };
  }

  return process.env.NODE_ENV === "production" ? true : false;
}
