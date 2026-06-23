const { google } = require('googleapis');

const SHEET_ID = process.env.GSHEET_ID;

// Singleton auth client
let _sheets = null;
async function getSheetsClient() {
  if (_sheets) return _sheets;
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _sheets = google.sheets({ version: 'v4', auth });
  return _sheets;
}

// ── Contacts Sheet ─────────────────────────────────────────────────────────

async function getContact(phone) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'contacts!A:I',
  });
  const rows = res.data.values || [];
  const headers = rows[0];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === phone) {
      return rowToContact(headers, rows[i], i + 1); // +1 for 1-based sheet row
    }
  }
  return null;
}

function rowToContact(headers, row, rowIndex) {
  const obj = { _rowIndex: rowIndex };
  headers.forEach((h, i) => { obj[h] = row[i] || ''; });
  return obj;
}

async function upsertContact(phone, fields, existingContact = null) {
  const sheets = await getSheetsClient();
  const existing = existingContact || await getContact(phone);
  const now = new Date().toISOString();

  if (existing) {
    // Update existing row
    const updated = { ...existing, ...fields, last_message_at: now };
    delete updated._rowIndex;
    const row = contactToRow(updated);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `contacts!A${existing._rowIndex}:I${existing._rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });
    return { ...updated, _rowIndex: existing._rowIndex };
  } else {
    // Append new contact
    const contact = {
      phone_number: phone,
      first_seen: now,
      last_message_at: now,
      last_intent: '',
      conversation_stage: 'new',
      has_replied_since: 'FALSE',
      follow_up_sent: 'FALSE',
      human_escalation: 'FALSE',
      last_message_id: '',
      ...fields,
    };
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'contacts!A:I',
      valueInputOption: 'RAW',
      requestBody: { values: [contactToRow(contact)] },
    });
    return contact;
  }
}

function contactToRow(c) {
  return [
    c.phone_number, c.first_seen, c.last_message_at,
    c.last_intent, c.conversation_stage,
    c.has_replied_since, c.follow_up_sent,
    c.human_escalation, c.last_message_id || '',
  ];
}

// Returns all contacts where has_replied_since=FALSE, follow_up_sent=FALSE
async function getContactsNeedingFollowUp() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'contacts!A:I',
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24h ago

  return rows.slice(1)
    .map((row, i) => rowToContact(headers, row, i + 2))
    .filter(c =>
      c.has_replied_since === 'FALSE' &&
      c.follow_up_sent === 'FALSE' &&
      c.human_escalation !== 'TRUE' &&
      c.conversation_stage === 'active' &&
      new Date(c.last_message_at).getTime() < cutoff
    );
}

// ── Deals Sheet ────────────────────────────────────────────────────────────

async function logDeal(deal) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'deals!A:I',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        new Date().toISOString(),
        deal.phone_number,
        deal.customer_name || '',
        deal.item_ordered || '',
        deal.quantity || '',
        'new_lead',
        'whatsapp_bot',
        'owner',
        '',
      ]],
    },
  });
}

// ── Message Log Sheet ──────────────────────────────────────────────────────

async function logMessage(entry) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'message_log!A:F',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        new Date().toISOString(),
        entry.phone,
        entry.direction,
        entry.text,
        entry.intent || '',
        entry.confidence || '',
      ]],
    },
  });
}

module.exports = { getContact, upsertContact, getContactsNeedingFollowUp, logDeal, logMessage };
