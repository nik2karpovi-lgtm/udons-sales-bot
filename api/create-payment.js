// Создание платежа через ЮKassa на полную стоимость выбранного тарифа.
// Живёт в том же проекте udons-sales-bot, отдельно от логики бота.

const TIERS = {
  base:     { name: 'База',          full: 15000 },
  hodovaya: { name: 'Ходовая',       full: 35000 },
  polniy:   { name: 'Полный привод', full: 70000 },
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Метод не поддерживается' });
    return;
  }

  try {
    const { tier, returnUrl } = req.body || {};
    const tierInfo = TIERS[tier];

    if (!tierInfo) {
      res.status(400).json({ error: 'Неизвестный тариф' });
      return;
    }

    const amount = tierInfo.full;
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');

    const idempotenceKey =
      (globalThis.crypto && globalThis.crypto.randomUUID)
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const ykResponse = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify({
        amount: { value: amount.toFixed(2), currency: 'RUB' },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: returnUrl || 'https://udons.ru/?paid=1',
        },
        description: `Оплата тарифа «${tierInfo.name}» (UDONS)`,
      }),
    });

    if (!ykResponse.ok) {
      const errText = await ykResponse.text();
      console.error('YooKassa error:', errText);
      res.status(502).json({ error: 'Не удалось создать платёж' });
      return;
    }

    const data = await ykResponse.json();
    const confirmationUrl = data?.confirmation?.confirmation_url;

    if (!confirmationUrl) {
      res.status(502).json({ error: 'ЮKassa не вернула ссылку на оплату' });
      return;
    }

    res.status(200).json({
      confirmationUrl,
      amount,
      tierName: tierInfo.name,
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
