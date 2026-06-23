# WABA Auto-Response Backend

Fully automated WhatsApp customer service backend for Indonesian UMKM.  
**Stack:** Node.js + Express + Google Sheets + OpenAI/Claude

---

## Architecture

```
Incoming WA Message
  → POST /webhook (signature verified)
  → Dedup check → Business hours check → Escalation freeze check
  → Single AI call: classify intent + generate reply
  → Send reply via WABA API
  → Update Google Sheets (contacts + deals + message_log)
  → Cron: every 30min checks for 24h no-reply → sends follow-up
```

## File Structure

```
src/
├── index.js                   # Express app entry point
├── routes/
│   └── webhook.js             # GET (verification) + POST (messages)
├── middleware/
│   └── verifySignature.js     # X-Hub-Signature-256 validation
├── services/
│   ├── messageProcessor.js    # Main orchestrator (all business rules)
│   ├── ai.js                  # Single LLM call: classify + respond
│   ├── sheets.js              # Google Sheets CRUD
│   └── whatsapp.js            # WABA send API + retry logic
├── jobs/
│   └── followUp.js            # 24h follow-up cron (node-cron)
└── utils/
    ├── businessRules.js       # Hours check + message deduplication
    ├── setupSheets.js         # One-time sheet header initialization
    └── testPayload.js         # Local message simulator
```

---

## Quick Start

### 1. Clone & Install
```bash
npm install
cp .env.example .env
# Fill in all values in .env
```

### 2. Google Sheets Setup
- Create a Google Sheet with 3 tabs: `contacts`, `deals`, `message_log`
- Create a Google Service Account, download JSON key
- Share the Google Sheet with the service account email (Editor access)
- Run once to set headers:
```bash
node src/utils/setupSheets.js
```

### 3. Meta WABA Setup
- Create app at developers.facebook.com
- Add WhatsApp product, verify phone number
- Register webhook URL: `https://your-domain.com/webhook`
- Set Verify Token (same as `WABA_VERIFY_TOKEN` in .env)
- Subscribe to: `messages`, `message_deliveries`

### 4. Run
```bash
# Local dev
npm run dev

# Production (Docker)
docker-compose up -d
```

### 5. Test Locally
```bash
node src/utils/testPayload.js "harga produk berapa?"
node src/utils/testPayload.js "mau pesan 2 pcs cod"
node src/utils/testPayload.js "barang rusak, kecewa banget"
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `WABA_ACCESS_TOKEN` | Meta long-lived access token |
| `WABA_PHONE_ID` | Phone number ID from Meta dashboard |
| `WABA_VERIFY_TOKEN` | Custom string for webhook handshake |
| `WABA_APP_SECRET` | App secret for signature verification |
| `AI_PROVIDER` | `openai` or `anthropic` |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key (if using Claude) |
| `GSHEET_ID` | Google Sheet document ID (from URL) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Private key (keep newlines as `\n`) |
| `BUSINESS_NAME` | Your business name |
| `JAM_OPERASIONAL` | e.g. `08.00-22.00 WIB` |
| `ESCALATION_PHONE` | Owner WA number for complaint alerts |
| `PRICE_LIST` | Plain text price list for AI context |
| `PRODUCT_CATALOG` | Product descriptions for AI context |

---

## Business Rules Implemented

| Rule | Implementation |
|---|---|
| No double follow-up | `follow_up_sent=TRUE` flag in GSheets |
| Reset follow-up on reply | Sets `has_replied_since=TRUE` on every inbound |
| Escalation freeze | Skips bot if `human_escalation=TRUE` |
| Working hours (08-22 WIB) | Checked before any AI call |
| Message deduplication | In-memory cache by `messageId` |
| Rate limit retry | 3x with 60s/120s/180s backoff |
| Media type rejection | Instant reply for non-text messages |
| AI fallback | Static templates if API times out |

---

## Token Efficiency

One AI call per message handles both classification AND response generation.  
- Model: `gpt-4o-mini` (OpenAI) or `claude-haiku-4-5` (Anthropic) — fast + cheap
- Max tokens: 300 (JSON output is compact)
- Estimated cost: ~$0.0003 per message (OpenAI), ~$0.0002 (Haiku)

---

## Deployment

Point your domain to port 3000. Use nginx reverse proxy + SSL for production:

```nginx
location /webhook {
    proxy_pass http://localhost:3000/webhook;
    proxy_set_header X-Hub-Signature-256 $http_x_hub_signature_256;
}
```
