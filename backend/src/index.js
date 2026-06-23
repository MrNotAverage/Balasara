require('dotenv').config();
const express = require('express');
const webhookRouter = require('./routes/webhook');
const { startFollowUpJob } = require('./jobs/followUp');

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS — allow frontend dashboard access ──────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// ── Body parsing — capture rawBody for signature verification ────────────
app.use((req, res, next) => {
  let data = '';
  req.on('data', (chunk) => (data += chunk));
  req.on('end', () => {
    req.rawBody = data;
    try { req.body = JSON.parse(data); } catch { req.body = {}; }
    next();
  });
});

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/webhook', webhookRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] WABA backend running on port ${PORT}`);
  startFollowUpJob();
});

// Graceful unhandled rejection logging
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled]', err.message);
});
