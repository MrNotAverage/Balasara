const cron = require('node-cron');
const sheets = require('../services/sheets');
const wa = require('../services/whatsapp');
const { isBusinessHours } = require('../utils/businessRules');

/**
 * Runs every 30 minutes.
 * Finds contacts who haven't replied in 24h and haven't been followed up.
 * Only runs during business hours to avoid sending at midnight.
 */
function startFollowUpJob() {
  cron.schedule('*/30 * * * *', async () => {
    if (!isBusinessHours()) return;

    console.log('[FollowUp] Checking for contacts needing follow-up...');
    let contacts;
    try {
      contacts = await sheets.getContactsNeedingFollowUp();
    } catch (err) {
      console.error('[FollowUp] Failed to fetch contacts:', err.message);
      return;
    }

    console.log(`[FollowUp] Found ${contacts.length} contact(s) to follow up`);

    for (const contact of contacts) {
      try {
        const entity = contact.last_intent === 'PRICE_INQUIRY' ? 'produk kami' : 'kebutuhan kakak';
        const msg =
          `Halo kak! Kemarin sempat hubungi kami soal ${entity} 😊\n` +
          `Ada yang bisa kami bantu lebih lanjut? Kami siap melayani kapan saja!`;

        await wa.sendText(contact.phone_number, msg);

        await sheets.upsertContact(contact.phone_number, {
          follow_up_sent: 'TRUE',
          conversation_stage: 'follow_up_sent',
        });

        console.log(`[FollowUp] Sent follow-up to ${contact.phone_number}`);
      } catch (err) {
        console.error(`[FollowUp] Failed for ${contact.phone_number}:`, err.message);
      }
    }
  });

  console.log('[FollowUp] Job scheduled (every 30 min, business hours only)');
}

module.exports = { startFollowUpJob };
