// Проверяет статус платежа НАПРЯМУЮ у ЮKassa (а не доверяет фронтенду) и только
// после подтверждения status=succeeded отдаёт полный текст главы или подтверждает подписку.

const { getRedisClient } = require('../lib/redis');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { paymentId, type, chapterId } = req.body;
    if (!paymentId) { res.status(400).json({ error: 'paymentId обязателен' }); return; }

    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');

    const ykRes = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
      headers: { 'Authorization': `Basic ${auth}` },
    });
    const payment = await ykRes.json();

    if (payment.status !== 'succeeded') {
      res.status(200).json({ unlocked: false, status: payment.status || 'unknown' });
      return;
    }

    if (type === 'subscription') {
      res.status(200).json({ unlocked: true, type: 'subscription' });
      return;
    }

    // type === 'chapter'
    if (!chapterId) { res.status(400).json({ error: 'chapterId обязателен для главы' }); return; }
    if (payment.metadata && payment.metadata.chapterId !== chapterId) {
      res.status(403).json({ error: 'chapterId не совпадает с оплаченным' });
      return;
    }

    const redisClient = await getRedisClient();
    const raw = await redisClient.get('book:chapters');
    const chapters = raw ? JSON.parse(raw) : [];
    const chapter = chapters.find((c) => c.id === chapterId);

    if (!chapter) { res.status(404).json({ error: 'Глава не найдена' }); return; }

    res.status(200).json({ unlocked: true, type: 'chapter', chapter: { id: chapter.id, title: chapter.title, content: chapter.content } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
};
