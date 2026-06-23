const sheets = require('./sheets');
const ai = require('./ai');
const wa = require('./whatsapp');
const { isDuplicate, isBusinessHours } = require('../utils/businessRules');

/**
 * Main entry point — processes one inbound WhatsApp message end-to-end.
 */
async function processMessage(payload) {
  // ── Parse payload ──────────────────────────────────────────────────────
  let entry, message;
  try {
    entry = payload.entry[0].changes[0].value;
    // Skip non-message events (status updates, read receipts, etc.)
    if (!entry.messages) return;
    message = entry.messages[0];
  } catch {
    return; // Malformed payload — silently drop
  }

  const phone = message.from;
  const messageId = message.id;
  const type = message.type;

  // ── Rule 5: Deduplication ─────────────────────────────────────────────
  if (isDuplicate(phone, messageId)) {
    console.log(`[Dedup] Dropped duplicate message ${messageId} from ${phone}`);
    return;
  }

  // ── Handle non-text (image, audio, video, etc.) ───────────────────────
  if (type !== 'text') {
    await wa.sendMediaUnsupported(phone);
    return;
  }

  const text = message.text?.body?.trim();
  if (!text) return;

  // ── Load or create contact ─────────────────────────────────────────────
  let contact = await sheets.getContact(phone);

  // ── Rule 3: Escalation freeze ─────────────────────────────────────────
  if (contact?.human_escalation === 'TRUE') {
    console.log(`[Escalation] Skipping bot response for ${phone} — flagged for human`);
    return;
  }

  // ── Base fields to reset on every inbound customer message ────────────
  const baseUpdates = {
    follow_up_sent: 'FALSE',
    conversation_stage: 'active',
    last_message_id: messageId,
  };

  // ── Rule 4: Business hours filter ────────────────────────────────────
  if (!isBusinessHours()) {
    await sheets.upsertContact(phone, { ...baseUpdates, has_replied_since: 'TRUE' }, contact);
    await wa.sendOutOfHours(phone);
    await sheets.logMessage({ phone, direction: 'outbound', text: 'Out-of-hours reply', intent: 'OUT_OF_HOURS' });
    return;
  }

  // ── AI: Classify + Generate Response (single API call) ───────────────
  let aiResult = await ai.classifyAndRespond(text);
  let intent = aiResult?.intent || 'UNKNOWN';
  let reply = aiResult?.reply || ai.getFallback(intent);
  let entity = aiResult?.key_entity || '';
  let confidence = aiResult?.confidence || 0;
  let customerName = aiResult?.customer_name || '';

  // ── Log inbound message ───────────────────────────────────────────────
  sheets.logMessage({ phone, direction: 'inbound', text, intent, confidence }).catch(() => {});

  // ── Handle by intent ──────────────────────────────────────────────────
  const contactUpdates = { last_intent: intent };

  if (intent === 'ORDER_INTENT') {
    await handleOrder(phone, text, reply, entity, customerName, contactUpdates);
  } else if (intent === 'COMPLAINT') {
    await handleComplaint(phone, reply, contactUpdates);
  } else {
    // PRICE_INQUIRY | GENERAL_INFO | FOLLOW_UP_CHECK | UNKNOWN
    await wa.sendText(phone, reply);
  }

  // ── Update contact record (single upsert — merges base resets + intent updates) ─
  await sheets.upsertContact(phone, {
    ...baseUpdates,
    ...contactUpdates,
    has_replied_since: 'FALSE', // Bot replied, now waiting for customer
  }, contact);

  // ── Log outbound ──────────────────────────────────────────────────────
  sheets.logMessage({ phone, direction: 'outbound', text: reply, intent }).catch(() => {});
}

async function handleOrder(phone, text, reply, entity, customerName, contactUpdates) {
  await wa.sendText(phone, reply);
  contactUpdates.conversation_stage = 'converted';

  // Log lead to CRM
  await sheets.logDeal({
    phone_number: phone,
    customer_name: customerName,
    item_ordered: entity,
    quantity: '',
  });
}

async function handleComplaint(phone, reply, contactUpdates) {
  await wa.sendText(phone, reply);
  contactUpdates.human_escalation = 'TRUE';
  contactUpdates.conversation_stage = 'escalated';

  // Notify owner if configured
  if (process.env.ESCALATION_PHONE) {
    const ownerMsg = `⚠️ COMPLAINT dari ${phone}. Butuh penanganan manual segera.`;
    wa.sendText(process.env.ESCALATION_PHONE, ownerMsg).catch(() => {});
  }
}

module.exports = { processMessage };
