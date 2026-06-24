require('dotenv').config();
const express = require('express');
const webhookRouter = require('./routes/webhook');
const authRouter = require('./routes/auth');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// ── Body parsing — capture rawBody for webhook signature verification ─────────
app.use((req, res, next) => {
  let data = '';
  req.on('data', (chunk) => (data += chunk));
  req.on('end', () => {
    req.rawBody = data;
    try { req.body = JSON.parse(data); } catch { req.body = {}; }
    next();
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/webhook', webhookRouter);
app.use('/auth', authRouter);
app.use('/settings', settingsRouter);

// Health check
app.get('/health', (req, res) => res.json({
  status: 'ok',
  ts: new Date().toISOString(),
  version: '2.0-multitenant',
}));

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] Balasara Multi-Tenant backend running on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled]', err.message);
});
