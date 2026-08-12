// Публикация новых страниц/глав книги "Три души в одном теле".
// Защищено секретным ключом (BOOK_ADMIN_SECRET в Environment Variables Vercel).
// Хранит главы в Redis одним JSON-массивом под ключом book:chapters.

const { getRedisClient } = require('../lib/redis');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { secret, volume, title, teaser, content } = req.body;

    if (!secret || secret !== process.env.BOOK_ADMIN_SECRET) {
      res.status(401).json({ error: 'Неверный ключ доступа' });
      return;
    }
    if (!volume || !title || !content) {
      res.status(400).json({ error: 'volume, title и content обязательны' });
      return;
    }

    const redisClient = await getRedisClient();
    const raw = await redisClient.get('book:chapters');
    const chapters = raw ? JSON.parse(raw) : [];

    const newChapter = {
      id: 'ch_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      volume: Number(volume),
      title,
      teaser: teaser || content.slice(0, 160) + '…',
      content,
      publishedAt: new Date().toISOString(),
    };

    chapters.push(newChapter);
    await redisClient.set('book:chapters', JSON.stringify(chapters));

    res.status(200).json({ success: true, chapter: { id: newChapter.id, volume: newChapter.volume, title: newChapter.title } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
};
