const express = require('express');
const router = express.Router();
const verifySignature = require('../middleware/verifySignature');
const { processMessage } = require('../services/messageProcessor');

/**
 * GET /webhook — Meta webhook verification handshake
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WABA_VERIFY_TOKEN) {
    console.log('[Webhook] Meta verification successful');
    return res.status(200).send(challenge);
  }
  res.status(403).send('Forbidden');
});

/**
 * POST /webhook — Incoming WhatsApp messages
 * Uses raw body for signature verification, then parses JSON manually
 */
router.post('/', verifySignature, async (req, res) => {
  // Acknowledge immediately (Meta requires 200 within 5s)
  res.status(200).json({ status: 'ok' });

  // Process async — do not await in the request handler
  processMessage(req.body).catch((err) => {
    console.error('[Webhook] Processing error:', err.message);
  });
});

module.exports = router;
