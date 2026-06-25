const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const prisma = require('../services/db');

// All routes below require a valid JWT

// ── GET /settings/me — Get current tenant profile ───────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      include: { metaConfig: true },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found.' });

    // Never expose password
    const { password, ...safe } = tenant;
    res.json(safe);
  } catch (err) {
    console.error('[Settings] GET /me error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PUT /settings/business — Update AI brain & business info ─────────────────
router.put('/business', requireAuth, async (req, res) => {
  try {
    const { businessName, productCatalog, priceList, operatingHours, customPrompt } = req.body;
    const updated = await prisma.tenant.update({
      where: { id: req.tenantId },
      data: {
        ...(businessName && { businessName }),
        ...(productCatalog !== undefined && { productCatalog }),
        ...(priceList !== undefined && { priceList }),
        ...(operatingHours !== undefined && { operatingHours }),
        ...(customPrompt !== undefined && { customPrompt }),
      },
    });
    const { password, ...safe } = updated;
    res.json({ message: 'Business settings updated!', tenant: safe });
  } catch (err) {
    console.error('[Settings] PUT /business error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PUT /settings/meta — Update WhatsApp API credentials ────────────────────
router.put('/meta', requireAuth, async (req, res) => {
  try {
    const { wabaPhoneId, wabaAccessToken, wabaAppSecret, verifyToken } = req.body;
    const config = await prisma.metaConfig.upsert({
      where: { tenantId: req.tenantId },
      update: {
        ...(wabaPhoneId !== undefined && { wabaPhoneId }),
        ...(wabaAccessToken !== undefined && { wabaAccessToken }),
        ...(wabaAppSecret !== undefined && { wabaAppSecret }),
        ...(verifyToken !== undefined && { verifyToken }),
        webhookActive: true,
      },
      create: {
        tenantId: req.tenantId,
        wabaPhoneId: wabaPhoneId || '',
        wabaAccessToken: wabaAccessToken || '',
        wabaAppSecret: wabaAppSecret || '',
        verifyToken: verifyToken || '',
      },
    });
    res.json({ message: 'WhatsApp credentials saved!', config: { ...config, wabaAccessToken: '***', wabaAppSecret: '***' } });
  } catch (err) {
    console.error('[Settings] PUT /meta error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /settings/messages — Paginated message log ──────────────────────────
router.get('/messages', requireAuth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
    const skip  = (page - 1) * limit;
    const intent = req.query.intent || undefined; // optional filter

    const where = {
      tenantId: req.tenantId,
      ...(intent && intent !== 'ALL' && { intent }),
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.message.count({ where }),
    ]);

    res.json({ messages, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[Settings] GET /messages error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /settings/stats — Summary stats for overview panel ──────────────────
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalMessages, todayMessages, intentCounts] = await Promise.all([
      prisma.message.count({ where: { tenantId } }),
      prisma.message.count({ where: { tenantId, createdAt: { gte: today } } }),
      prisma.message.groupBy({
        by: ['intent'],
        where: { tenantId },
        _count: { intent: true },
      }),
    ]);

    const intentBreakdown = {};
    intentCounts.forEach(({ intent, _count }) => {
      intentBreakdown[intent] = _count.intent;
    });

    res.json({ totalMessages, todayMessages, intentBreakdown });
  } catch (err) {
    console.error('[Settings] GET /stats error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
