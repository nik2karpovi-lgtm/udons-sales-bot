// Регистрация нового пользователя. Пароль хешируется (bcrypt), не хранится в открытом виде.

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
    const { email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'email и password обязательны' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const redisClient = await getRedisClient();

    const existing = await redisClient.get(`user:email:${normalizedEmail}`);
    if (existing) {
      res.status(409).json({ error: 'Пользователь с таким email уже зарегистрирован' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    const user = {
      id: userId,
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      avatarUrl: null,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await redisClient.set(`user:email:${normalizedEmail}`, JSON.stringify(user));
    await redisClient.set(`user:id:${userId}`, JSON.stringify(user));

    const token = signToken({ userId, email: normalizedEmail });

    res.status(200).json({
      token,
      user: { id: userId, email: normalizedEmail, name: user.name, avatarUrl: user.avatarUrl },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
};
