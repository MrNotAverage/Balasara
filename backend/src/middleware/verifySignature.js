const crypto = require('crypto');

/**
 * Validates X-Hub-Signature-256 from Meta webhook.
 * Must be used with express.raw() body parser on the route.
 */
function verifySignature(req, res, next) {
  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return res.status(403).json({ error: 'Missing signature' });

  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.WABA_APP_SECRET || '')
    .update(req.rawBody || '')
    .digest('hex');

  if (sig !== expected) {
    console.warn('[Security] Webhook signature mismatch — dropping request');
    return res.status(403).json({ error: 'Signature mismatch' });
  }
  next();
}

module.exports = verifySignature;
