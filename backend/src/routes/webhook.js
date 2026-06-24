const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../services/db');
const { processMessage } = require('../services/messageProcessor');

/**
 * GET /webhook — Meta webhook verification handshake (multi-tenant)
 * Meta sends: hub.mode, hub.verify_token, hub.challenge
 * We match the verify_token against all registered tenants.
 */
router.get('/', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode !== 'subscribe' || !token) {
    return res.status(403).send('Forbidden');
  }

  // Find which tenant owns this verify token
  const config = await prisma.metaConfig.findFirst({ where: { verifyToken: token } });
  if (!config) {
    console.warn('[Webhook] No tenant found for verify_token:', token);
    return res.status(403).send('Forbidden');
  }

  console.log(`[Webhook] Verified for tenantId: ${config.tenantId}`);
  return res.status(200).send(challenge);
});

/**
 * POST /webhook — Incoming WhatsApp messages (multi-tenant)
 * Identifies tenant by phone_number_id in payload, verifies signature,
 * then passes full tenant context to the message processor.
 */
router.post('/', async (req, res) => {
  // Acknowledge immediately — Meta requires 200 within 5s
  res.status(200).json({ status: 'ok' });

  try {
    // Extract which phone number received the message
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    if (!entry) return;

    const phoneNumberId = entry.metadata?.phone_number_id;
    if (!phoneNumberId) return;

    // Find the tenant that owns this phone number
    const metaConfig = await prisma.metaConfig.findFirst({
      where: { wabaPhoneId: phoneNumberId },
      include: { tenant: true },
    });

    if (!metaConfig) {
      console.warn(`[Webhook] No tenant found for phone_number_id: ${phoneNumberId}`);
      return;
    }

    // Verify the request signature using tenant's own app secret
    const sig = req.headers['x-hub-signature-256'];
    if (sig && metaConfig.wabaAppSecret) {
      const expected = 'sha256=' + crypto
        .createHmac('sha256', metaConfig.wabaAppSecret)
        .update(req.rawBody || '')
        .digest('hex');
      if (sig !== expected) {
        console.warn(`[Security] Signature mismatch for tenantId: ${metaConfig.tenantId}`);
        return;
      }
    }

    // Process message with full tenant context
    processMessage(req.body, metaConfig).catch((err) => {
      console.error('[Webhook] Processing error:', err.message);
    });

  } catch (err) {
    console.error('[Webhook] Error:', err.message);
  }
});

module.exports = router;
