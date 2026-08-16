// Проверяет токен из заголовка Authorization и возвращает текущего пользователя.
// Используется фронтендом при загрузке страницы, чтобы узнать, залогинен ли посетитель.

const { getRedisClient } = require('../lib/redis');
const { verifyToken } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) { res.status(401).json({ error: 'Нет токена' }); return; }

    const payload = verifyToken(token);
    if (!payload) { res.status(401).json({ error: 'Токен недействителен' }); return; }

    const redisClient = await getRedisClient();
    const raw = await redisClient.get(`user:id:${payload.userId}`);
    if (!raw) { res.status(404).json({ error: 'Пользователь не найден' }); return; }

    const user = JSON.parse(raw);
    res.status(200).json({ user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
};
