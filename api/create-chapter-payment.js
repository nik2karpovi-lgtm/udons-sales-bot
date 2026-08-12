// Создание платежа за одну страницу книги (500₽) или за подписку (1000₽/мес).
// paymentId возвращается фронтенду ДО редиректа — фронт сохраняет его в localStorage
// сам, поэтому после возврата с ЮKassa мы точно знаем, какой платёж проверять.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { type, chapterId, chapterTitle, returnUrl } = req.body;
    // type: 'chapter' (разовая покупка страницы, 500₽) или 'subscription' (1000₽/мес)

    if (type !== 'chapter' && type !== 'subscription') {
      res.status(400).json({ error: 'type должен быть chapter или subscription' });
      return;
    }
    if (type === 'chapter' && !chapterId) {
      res.status(400).json({ error: 'chapterId обязателен для покупки главы' });
      return;
    }

    const amount = type === 'subscription' ? 1000 : 500;
    const description = type === 'subscription'
      ? 'Подписка на книгу «Три души в одном теле» — 1000₽/мес'
      : `Глава книги «Три души в одном теле»: ${chapterTitle || chapterId}`;

    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    const idempotenceKey = `book-${type}-${chapterId || 'sub'}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const base = returnUrl || 'https://udons.ru/td1t';
    const separator = base.indexOf('?') === -1 ? '?' : '&';
    const finalReturnUrl = `${base}${separator}type=${type}${chapterId ? '&chapterId=' + encodeURIComponent(chapterId) : ''}`;

    const ykRes = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify({
        amount: { value: amount.toFixed(2), currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: finalReturnUrl },
        capture: true,
        description,
        metadata: { type, chapterId: chapterId || null },
      }),
    });

    const ykData = await ykRes.json();

    if (ykData.confirmation && ykData.confirmation.confirmation_url) {
      res.status(200).json({ confirmationUrl: ykData.confirmation.confirmation_url, paymentId: ykData.id });
    } else {
      console.error('YooKassa error:', ykData);
      res.status(500).json({ error: 'Не удалось создать платёж' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
};
