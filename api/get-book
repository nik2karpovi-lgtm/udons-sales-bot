// Отдаёт список глав книги (только тизеры, без полного текста) —
// используется для отрисовки страницы. Полный текст выдаёт verify-chapter-payment.js
// после подтверждения оплаты.

const { getRedisClient } = require('../lib/redis');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const redisClient = await getRedisClient();
    const raw = await redisClient.get('book:chapters');
    const chapters = raw ? JSON.parse(raw) : [];

    const publicChapters = chapters
      .map((c) => ({
        id: c.id,
        volume: c.volume,
        title: c.title,
        teaser: c.teaser,
        publishedAt: c.publishedAt,
      }))
      .sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));

    res.status(200).json({ chapters: publicChapters });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
};
