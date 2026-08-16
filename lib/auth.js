// Хелпер для создания и проверки JWT-токенов авторизации.
// Секрет берётся из переменной окружения AUTH_JWT_SECRET (добавь в Vercel!).

const jwt = require('jsonwebtoken');

function signToken(payload) {
  return jwt.sign(payload, process.env.AUTH_JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.AUTH_JWT_SECRET);
  } catch (e) {
    return null;
  }
}

module.exports = { signToken, verifyToken };
