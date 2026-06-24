const ai = require('./ai');
const wa = require('./whatsapp');
const { isDuplicate, isBusinessHours } = require('../utils/businessRules');

/**
 * Main entry point — processes one inbound WhatsApp message for a specific tenant.
 * @param {object} payload - Raw Meta webhook payload
 * @param {object} metaConfig - Tenant's MetaConfig (includes .tenant relation)
 */
async function processMessage(payload, metaConfig) {
  const tenant = metaConfig.tenant;

  // ── Parse payload ──────────────────────────────────────────────────────
  let entry, message;
  try {
    entry = payload.entry[0].changes[0].value;

    // Log message status updates (delivered, read, failed)
    if (entry.statuses) {
      const status = entry.statuses[0];
      console.log(`[WA Status][Tenant:${tenant.id}] Message ${status.id} is now ${status.status}`);
      if (status.errors) {
        console.error(`[WA Error][Tenant:${tenant.id}] Delivery failed:`, JSON.stringify(status.errors));
      }
      return;
    }

    if (!entry.messages) return;
    message = entry.messages[0];
  } catch {
    return;
  }

  const phone = message.from;
  const messageId = message.id;
  const type = message.type;

  // ── Deduplication ─────────────────────────────────────────────────────
  if (isDuplicate(phone, messageId)) {
    console.log(`[Dedup][Tenant:${tenant.id}] Dropped duplicate ${messageId} from ${phone}`);
    return;
  }

  // ── Handle non-text (image, audio, etc.) ──────────────────────────────
  if (type !== 'text') {
    await wa.sendMediaUnsupported(phone, metaConfig);
    return;
  }

  const text = message.text?.body?.trim();
  if (!text) return;

  console.log(`[MSG][Tenant:${tenant.id}][${tenant.businessName}] From ${phone}: "${text}"`);

  // ── Business hours filter ─────────────────────────────────────────────
  if (!isBusinessHours()) {
    await wa.sendOutOfHours(phone, metaConfig, tenant.operatingHours);
    return;
  }

  // ── AI: Classify + Generate Response ─────────────────────────────────
  const aiResult = await ai.classifyAndRespond(text, tenant);
  const intent = aiResult?.intent || 'UNKNOWN';
  const reply = aiResult?.reply || ai.getFallback(intent);

  console.log(`[AI][Tenant:${tenant.id}] Intent: ${intent} | Reply: ${reply.slice(0, 60)}`);

  // ── Send reply ─────────────────────────────────────────────────────────
  await wa.sendText(phone, reply, metaConfig);

  // ── Handle escalation ─────────────────────────────────────────────────
  if (intent === 'COMPLAINT' && process.env.ESCALATION_PHONE) {
    const ownerMsg = `⚠️ [${tenant.businessName}] COMPLAINT dari ${phone}. Butuh penanganan manual.`;
    wa.sendText(process.env.ESCALATION_PHONE, ownerMsg, metaConfig).catch(() => {});
  }
}

module.exports = { processMessage };
