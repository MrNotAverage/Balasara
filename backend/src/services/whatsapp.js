const axios = require('axios');

const getWaBase = () =>
  `https://graph.facebook.com/v21.0/${process.env.WABA_PHONE_ID}/messages`;
const HEADERS = () => ({
  Authorization: `Bearer ${process.env.WABA_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
});

async function sendText(to, body, attempt = 1) {
  try {
    const res = await axios.post(
      getWaBase(),
      { messaging_product: 'whatsapp', to, type: 'text', text: { body } },
      { headers: HEADERS(), timeout: 8000 }
    );
    console.log(`[WA] Sent to ${to}: ${body.slice(0, 60)}...`);
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    if (status === 429 && attempt <= 3) {
      // Rate limit — exponential backoff
      const delay = attempt * 60000;
      console.warn(`[WA] Rate limited. Retry ${attempt}/3 in ${delay / 1000}s`);
      await sleep(delay);
      return sendText(to, body, attempt + 1);
    }
    console.error(`[WA] Failed to send to ${to}:`, err.response?.data || err.message);
    throw err;
  }
}

async function sendMediaUnsupported(to) {
  return sendText(to, 'Maaf kak, saat ini kami hanya bisa membalas pesan teks 🙏');
}

async function sendOutOfHours(to) {
  return sendText(
    to,
    `Terima kasih pesannya! Kami akan balas segera di jam operasional (${process.env.JAM_OPERASIONAL || '08.00-22.00 WIB'}) 🙏`
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { sendText, sendMediaUnsupported, sendOutOfHours };
