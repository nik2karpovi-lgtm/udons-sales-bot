// Общее подключение к Redis для всех serverless-функций.
// Лежит в /lib, а не в /api — Vercel не создаёт из него отдельный роут.

const { createClient } = require('redis');

let client;

async function getRedisClient() {
  if (client && client.isOpen) return client;
  client = createClient({ url: process.env.REDIS_URL });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();
  return client;
}

module.exports = { getRedisClient };
