// Вход существующего пользователя. Сравнивает пароль с хешем через bcrypt.

const bcrypt = require('bcryptjs');
const { getRedisClient } = require('../lib/redis');
const { signToken } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'email и password обязательны' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const redisClient = await getRedisClient();
    const raw = await redisClient.get(`user:email:${normalizedEmail}`);

    if (!raw) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const user = JSON.parse(raw);
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });

    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
};
