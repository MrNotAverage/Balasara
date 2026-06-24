const axios = require('axios');

/**
 * Send a plain text WhatsApp message using tenant-specific credentials.
 * @param {string} to - Recipient phone number (e.g. "628123456789")
 * @param {string} body - Message text
 * @param {object} metaConfig - Tenant's MetaConfig from DB
 */
async function sendText(to, body, metaConfig, attempt = 1) {
  const url = `https://graph.facebook.com/v25.0/${metaConfig.wabaPhoneId}/messages`;
  const headers = {
    Authorization: `Bearer ${metaConfig.wabaAccessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const res = await axios.post(
      url,
      { messaging_product: 'whatsapp', to, type: 'text', text: { body } },
      { headers, timeout: 8000 }
    );
    console.log(`[WA][Tenant:${metaConfig.tenantId}] Sent to ${to}: ${body.slice(0, 60)}`);
    console.log(`[WA] Meta response:`, JSON.stringify(res.data));
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    console.error(`[WA][Tenant:${metaConfig.tenantId}] FAILED to send to ${to} (HTTP ${status}):`, JSON.stringify(err.response?.data || err.message));
    if (status === 429 && attempt <= 3) {
      const delay = attempt * 60000;
      console.warn(`[WA] Rate limited. Retry ${attempt}/3 in ${delay / 1000}s`);
      await sleep(delay);
      return sendText(to, body, metaConfig, attempt + 1);
    }
    throw err;
  }
}

async function sendMediaUnsupported(to, metaConfig) {
  return sendText(to, 'Maaf kak, saat ini kami hanya bisa membalas pesan teks 🙏', metaConfig);
}

async function sendOutOfHours(to, metaConfig, hours) {
  return sendText(
    to,
    `Terima kasih pesannya! Kami akan balas segera di jam operasional (${hours || '08.00-22.00 WIB'}) 🙏`,
    metaConfig
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { sendText, sendMediaUnsupported, sendOutOfHours };
