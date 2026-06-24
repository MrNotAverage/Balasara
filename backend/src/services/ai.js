const axios = require('axios');

/**
 * Classify customer intent and generate a reply using tenant-specific AI context.
 * @param {string} text - Customer's message
 * @param {object} tenant - Tenant record from DB (has businessName, productCatalog, etc.)
 */
async function classifyAndRespond(text, tenant) {
  const systemPrompt = buildPrompt(tenant);

  try {
    return await callGemini(systemPrompt, text);
  } catch (err) {
    console.error('[AI] API call failed:', err.message);
    return null;
  }
}

function buildPrompt(tenant) {
  // If the tenant provided a fully custom prompt, use it as a base
  const customBase = tenant.customPrompt
    ? `\nADDITIONAL INSTRUCTIONS FROM BUSINESS OWNER:\n${tenant.customPrompt}\n`
    : '';

  return `You are a WhatsApp customer service AI for "${tenant.businessName}" in Indonesia.

TASK: Analyze the customer message and return JSON with:
1. Intent classification
2. A ready-to-send WhatsApp reply

INTENTS:
- PRICE_INQUIRY: harga, berapa, diskon, promo, murah
- ORDER_INTENT: pesan, order, mau beli, bisa kirim, cod
- COMPLAINT: kecewa, rusak, salah, telat, tidak sesuai, komplain
- GENERAL_INFO: lokasi, jam buka, produk apa saja, cara pesan
- FOLLOW_UP_CHECK: sudah pesan, cek pesanan, kapan sampai, status
- UNKNOWN: anything else

BUSINESS CONTEXT:
- Business Name: ${tenant.businessName}
- Operating Hours: ${tenant.operatingHours || '08.00-22.00 WIB'}
- Products: ${tenant.productCatalog || 'Tanyakan langsung kepada tim kami'}
- Price list: ${tenant.priceList || 'Harga bervariasi, silakan tanyakan'}
${customBase}
REPLY RULES:
- Max 3 sentences
- Match customer language (Indonesian/English)
- Warm, friendly tone with 1 emoji max
- For ORDER_INTENT: ask for name, address, quantity
- For COMPLAINT: apologize + ask for order number, do NOT promise resolution time
- Include soft CTA when appropriate

Respond ONLY with valid JSON, no markdown:
{"intent":"<INTENT>","confidence":<0.0-1.0>,"key_entity":"<product/item or empty>","reply":"<ready WhatsApp message>","customer_name":"<if mentioned in text or empty>"}`;
}

async function callGemini(systemPrompt, userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nCustomer message: ${userMessage}` }],
        },
      ],
      generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
    },
    { timeout: 10000 }
  );

  let raw = res.data.candidates[0].content.parts[0].text.trim();
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(raw);
}

const FALLBACK_RESPONSES = {
  PRICE_INQUIRY: `Halo kak! Untuk info harga lengkap, boleh ceritakan produk apa yang kakak minati? 😊`,
  ORDER_INTENT: `Siap kak! Boleh konfirmasi nama, alamat pengiriman, dan jumlah yang dipesan? 🙏`,
  COMPLAINT: `Halo kak, kami turut minta maaf 🙏 Boleh kami minta nomor pesanannya?`,
  GENERAL_INFO: `Halo! Ada yang bisa kami bantu? 😊`,
  FOLLOW_UP_CHECK: `Halo kak! Boleh ceritakan detail pesanannya? 🙏`,
  UNKNOWN: `Halo kak, terima kasih pesannya! Boleh ceritakan lebih detail kebutuhannya? 🙏`,
};

function getFallback(intent) {
  return FALLBACK_RESPONSES[intent] || FALLBACK_RESPONSES.UNKNOWN;
}

module.exports = { classifyAndRespond, getFallback };
