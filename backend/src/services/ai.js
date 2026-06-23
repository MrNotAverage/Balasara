const axios = require('axios');

const FALLBACK_RESPONSES = {
  PRICE_INQUIRY: `Halo kak! Terima kasih udah hubungi kami 😊\nUntuk info harga lengkap, tim kami siap bantu.\nAda produk tertentu yang ingin ditanyakan?`,
  ORDER_INTENT: `Siap kak! Kami catat pesanan kakak ya.\nBoleh konfirmasi: nama, alamat pengiriman, dan jumlah yang dipesan? 🙏`,
  COMPLAINT: `Halo kak, kami turut minta maaf atas ketidaknyamanannya 🙏\nTim kami akan segera menghubungi kakak untuk menyelesaikan ini.\nBoleh kami minta nomor pesanannya?`,
  GENERAL_INFO: `Halo! Kami buka setiap hari jam ${process.env.JAM_OPERASIONAL || '08.00-22.00 WIB'}.\nAda yang bisa dibantu? 😊`,
  FOLLOW_UP_CHECK: `Halo kak! Kami di sini untuk membantu.\nBoleh ceritakan lebih detail mengenai pesanan kakak? 🙏`,
  UNKNOWN: `Halo kak, terima kasih pesannya!\nUntuk respons lebih cepat, boleh ceritakan lebih detail kebutuhannya?\nTim kami siap membantu 🙏`,
};

/**
 * Single LLM call: classify intent AND generate reply simultaneously.
 * Token-efficient: one round-trip, structured JSON output.
 */
async function classifyAndRespond(text, conversationHistory = '') {
  const systemPrompt = `You are a WhatsApp customer service AI for ${process.env.BUSINESS_NAME || 'toko kami'} in Indonesia.

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
- Business: ${process.env.BUSINESS_NAME || '[BUSINESS_NAME]'}
- Hours: ${process.env.JAM_OPERASIONAL || '08.00-22.00 WIB'}
- Products: ${process.env.PRODUCT_CATALOG || '[PRODUCT_CATALOG]'}
- Price list: ${process.env.PRICE_LIST || '[PRICE_LIST]'}

REPLY RULES:
- Max 3 sentences
- Match customer language (Indonesian/English)
- Warm, friendly tone with 1 emoji max
- For ORDER_INTENT: ask for name, address, quantity
- For COMPLAINT: apologize + ask for order number, do NOT promise resolution time
- Include soft CTA when appropriate

Respond ONLY with valid JSON, no markdown:
{"intent":"<INTENT>","confidence":<0.0-1.0>,"key_entity":"<product/item or empty>","reply":"<ready WhatsApp message>","customer_name":"<if mentioned in text or empty>"}`;

  const userMessage = conversationHistory
    ? `Previous context: ${conversationHistory}\n\nCurrent message: ${text}`
    : text;

  try {
    if (process.env.AI_PROVIDER === 'anthropic') {
      return await callAnthropic(systemPrompt, userMessage);
    }
    if (process.env.AI_PROVIDER === 'openai') {
      return await callOpenAI(systemPrompt, userMessage);
    }
    // Default: use Gemini (free tier available)
    return await callGemini(systemPrompt, userMessage);
  } catch (err) {
    console.error('[AI] API call failed:', err.message);
    return null; // caller handles fallback
  }
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
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 300,
      },
    },
    { timeout: 10000 }
  );

  let raw = res.data.candidates[0].content.parts[0].text.trim();
  // Strip markdown code fences if Gemini wraps JSON
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(raw);
}


async function callOpenAI(systemPrompt, userMessage) {
  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      max_tokens: 300,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, timeout: 10000 }
  );
  return JSON.parse(res.data.choices[0].message.content);
}

async function callAnthropic(systemPrompt, userMessage) {
  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      timeout: 10000,
    }
  );
  let raw = res.data.content[0].text.trim();
  // Strip markdown code fences — Claude may wrap JSON in ```json ... ```
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(raw);
}

function getFallback(intent) {
  return FALLBACK_RESPONSES[intent] || FALLBACK_RESPONSES.UNKNOWN;
}

module.exports = { classifyAndRespond, getFallback };
