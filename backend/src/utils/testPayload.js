/**
 * Simulate inbound WhatsApp messages for local testing.
 * Usage: node src/utils/testPayload.js "harga produk berapa?"
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { processMessage } = require('../services/messageProcessor');

const testMessages = [
  'harga produk berapa kak?',
  'mau pesan 2 pcs, bisa cod?',
  'produknya rusak pas nyampe, sangat kecewa',
  'jam buka sampai jam berapa?',
  'udah transfer tapi belum diproses',
  'blablabla random stuff',
];

const text = process.argv[2] || testMessages[0];
const phone = '628123456789';

const fakePayload = {
  entry: [{
    changes: [{
      value: {
        messages: [{
          from: phone,
          id: 'msg_' + Date.now(),
          type: 'text',
          text: { body: text },
          timestamp: Math.floor(Date.now() / 1000).toString(),
        }],
      },
    }],
  }],
};

console.log(`\n📨 Testing with message: "${text}"\n`);
processMessage(fakePayload)
  .then(() => console.log('\n✅ Processing complete'))
  .catch(console.error);
