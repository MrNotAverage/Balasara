const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../services/db');

const JWT_SECRET = process.env.JWT_SECRET || 'balasara_jwt_secret_change_this';

// ── POST /auth/register ──────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, businessName } = req.body;
    if (!email || !password || !businessName) {
      return res.status(400).json({ error: 'Email, password, and business name are required.' });
    }

    const existing = await prisma.tenant.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const tenant = await prisma.tenant.create({
      data: {
        email,
        password: hashed,
        businessName,
        metaConfig: { create: {} }, // Create empty MetaConfig
      },
    });

    const token = jwt.sign({ tenantId: tenant.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, tenantId: tenant.id, businessName: tenant.businessName });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ── POST /auth/login ─────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { email } });
    if (!tenant) return res.status(401).json({ error: 'Invalid email or password.' });

    const match = await bcrypt.compare(password, tenant.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ tenantId: tenant.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, tenantId: tenant.id, businessName: tenant.businessName });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

module.exports = router;
