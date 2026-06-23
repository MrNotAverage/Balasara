/**
 * Run once: node src/utils/setupSheets.js
 * Sets up headers on all 3 Google Sheets tabs.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { google } = require('googleapis');

async function setup() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const id = process.env.GSHEET_ID;

  const tabs = [
    {
      range: 'contacts!A1:I1',
      values: [['phone_number','first_seen','last_message_at','last_intent','conversation_stage','has_replied_since','follow_up_sent','human_escalation','last_message_id']],
    },
    {
      range: 'deals!A1:I1',
      values: [['timestamp','phone_number','customer_name','item_ordered','quantity','status','source','assigned_to','notes']],
    },
    {
      range: 'message_log!A1:F1',
      values: [['timestamp','phone_number','direction','message_text','intent','confidence']],
    },
  ];

  for (const tab of tabs) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: tab.range,
      valueInputOption: 'RAW',
      requestBody: { values: tab.values },
    });
    console.log(`✅ Headers set for ${tab.range}`);
  }
  console.log('Setup complete!');
}

setup().catch(console.error);
