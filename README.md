# GTC Telegram Bot — Cloudflare Worker

A full-featured GTC Telegram mining & airdrop bot converted from Python to JavaScript for Cloudflare Workers.

## Prerequisites

- [Cloudflare account](https://cloudflare.com) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/): `npm install -g wrangler`
- A Telegram Bot Token from [@BotFather](https://t.me/BotFather)

---

## Step 1 — Install dependencies

```bash
npm install
```

---

## Step 2 — Login to Cloudflare

```bash
wrangler login
```

---

## Step 3 — Create D1 Database

```bash
wrangler d1 create gtc-bot-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "gtc-bot-db"
database_id = "PASTE_YOUR_DATABASE_ID_HERE"
```

---

## Step 4 — Create KV Namespace

```bash
wrangler kv:namespace create BOT_STATE
```

Copy the `id` from the output and paste it into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "BOT_STATE"
id = "PASTE_YOUR_KV_NAMESPACE_ID_HERE"
```

---

## Step 5 — Set Secrets

```bash
wrangler secret put BOT_TOKEN
# Paste your Telegram bot token when prompted

wrangler secret put ADMIN_ID
# Paste your Telegram user ID (number) when prompted

wrangler secret put OXAPAY_API_KEY
# Paste your OxaPay merchant API key when prompted
```

---

## Step 6 — Initialize the Database

```bash
# Apply schema to local (for dev)
npm run db:init

# Apply schema to remote (production)
npm run db:init:remote
```

---

## Step 7 — Deploy

```bash
npm run deploy
```

Note your Worker URL (e.g. `https://gtc-telegram-bot.YOUR_SUBDOMAIN.workers.dev`)

---

## Step 8 — Register the Webhook

Open your browser and visit:

```
https://gtc-telegram-bot.YOUR_SUBDOMAIN.workers.dev/setup
```

You should see: `{"ok": true, "result": true, ...}`

Your bot is now live!

---

## Local Development

```bash
npm run dev
```

For local dev, use [ngrok](https://ngrok.com) to expose your local port and manually set the webhook via:

```
https://api.telegram.org/botTOKEN/setWebhook?url=YOUR_NGROK_URL/webhook/TOKEN
```

---

## Configuration

| Setting           | Default | Description                        |
|-------------------|---------|------------------------------------|
| `refer_amount`    | 50 GTC  | Coins earned per referral          |
| `mine_amount`     | 10 GTC  | Coins per daily mine               |
| `mine_cooldown`   | 86400s  | Seconds between mines (24h)        |
| `min_withdrawal`  | 1000 GTC| Minimum balance to withdraw        |
| `comment_post_url`| x.com   | URL for the comment task           |

All settings are editable by the admin in real-time via the bot's **⚙️ Settings** menu.

---

## Architecture

| Component      | Technology           |
|----------------|----------------------|
| Runtime        | Cloudflare Workers (JS) |
| Database       | Cloudflare D1 (SQLite-compatible) |
| Session state  | Cloudflare KV        |
| Bot protocol   | Telegram Webhook     |
| Payments       | OxaPay API           |
| QR Codes       | api.qrserver.com     |

---

## File Structure

```
worker.js           — Entry point (Cloudflare Worker)
wrangler.toml       — Cloudflare configuration
schema.sql          — D1 database schema
src/
  config.js         — Constants and channel configuration
  db.js             — D1 database operations
  oxapay.js         — OxaPay payment integration
  telegram.js       — Telegram Bot API helper + keyboard builders
  state.js          — KV-based conversation state manager
  router.js         — Main message/callback router
  handlers/
    onboarding.js   — Emoji verification, channel join, screenshot flow
    user.js         — Balance, mine, refer, profile, withdrawal
    admin.js        — Admin panel, pending requests, settings, announcements
    callbacks.js    — All inline button callback handlers
```

---

## Differences from Python Version

| Python               | JavaScript (Cloudflare)           |
|----------------------|-----------------------------------|
| Long polling         | Webhook (required for Workers)    |
| SQLite file          | Cloudflare D1                     |
| python-telegram-bot  | Direct Telegram Bot API via fetch |
| qrcode library       | api.qrserver.com (URL-based)      |
| ConversationHandler  | Cloudflare KV state               |
| context.user_data    | Cloudflare KV per-user data       |
