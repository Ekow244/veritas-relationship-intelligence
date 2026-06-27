# Veritas WhatsApp Bot MVP

This is the webhook service for the Veritas romance-scam WhatsApp MVP. It is separate from the static marketing site because GitHub Pages cannot receive WhatsApp webhooks.

## What Is Built

- Meta WhatsApp Cloud API webhook: `GET /webhook` verification and `POST /webhook` inbound messages
- Twilio WhatsApp sandbox webhook: `POST /twilio/webhook`
- Local simulator: `POST /simulate`
- Multi-turn in-memory sessions with a 30-minute default TTL
- Greeting, scope refusal, crisis response, report-back, and delete-my-data commands
- Conservative romance-scam signal taxonomy with explainable verdicts
- Derived JSONL case/report storage with raw-chat/media minimization
- Optional OpenAI Responses API analysis for chat screenshots/profile images when configured

## Local Run

From the repo root:

```bash
npm run bot:build
HOST=127.0.0.1 PORT=8787 USER_HASH_SALT=dev-only-change-me npm run bot:start
```

In another terminal:

```bash
curl -X POST http://localhost:8787/simulate \
  -H "content-type: application/json" \
  -d '{
    "from": "+15551234567",
    "text": "He said he loves me after two days and needs me to send money for a hospital emergency. He also says his camera is broken when I ask for a video call."
  }'
```

Run the built-in smoke test:

```bash
npm run bot:test
```

## Environment Variables

Copy `bot/.env.example` into your hosting provider's environment settings. The service does not load `.env` files automatically, so local shell exports or host env vars are required.

Required for production:

- `PORT`
- `HOST`
- `USER_HASH_SALT`
- `PUBLIC_BASE_URL`

Required for Meta WhatsApp Cloud API:

- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_API_VERSION`

Optional analysis:

- `ENABLE_OPENAI_ANALYSIS=true`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Optional Twilio sandbox:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`

## Meta WhatsApp Cloud API Wiring

1. Create or open a Meta developer app.
2. Add the WhatsApp product.
3. Get the test or production WhatsApp phone number ID.
4. Create a long-lived system-user access token with WhatsApp send permissions.
5. Deploy this bot service to a backend host such as Render, Railway, Fly.io, or a small VPS.
6. Set the environment variables above.
7. In Meta, configure the callback URL:

```text
https://<your-bot-host>/webhook
```

8. Use the same value as `WHATSAPP_VERIFY_TOKEN` for webhook verification.
9. Subscribe the webhook to WhatsApp `messages`.
10. Send a WhatsApp test message to the configured number.

The bot sends an immediate "analyzing" message for chat/image inputs, then sends a verdict.

## Twilio Sandbox Wiring

Use this for day-one sandbox testing if Meta production setup is not ready.

1. Open Twilio Console > Messaging > Try it out > WhatsApp Sandbox.
2. Join the sandbox from your phone.
3. Deploy this bot service.
4. Set the incoming message webhook to:

```text
https://<your-bot-host>/twilio/webhook
```

5. If you set `TWILIO_AUTH_TOKEN`, also set `PUBLIC_BASE_URL` exactly to the deployed origin so signature verification can reconstruct the URL.

Twilio mode replies with TwiML synchronously. It is useful for prototype testing; Meta Cloud API is the cleaner launch path.

### Interim "Analyzing…" message

When `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are both set, the bot replies to a chat or
screenshot with an immediate "🔎 Analyzing…" message (synchronous TwiML), then sends the verdict
as a second message via the Twilio REST API. Without these credentials it falls back to a single
synchronous verdict reply. `PUBLIC_BASE_URL` must match the deployed origin exactly so inbound
signature verification passes.

**Keep-warm:** on Render's free tier the service sleeps after ~15 minutes idle and a cold start can
take ~30s — long enough that the verdict lands well after "Analyzing…". Keep it warm with a cron
ping to `/health` every ~10 minutes (a free uptime pinger or a scheduled GitHub Action).

## Deploying the Bot

GitHub Pages can continue hosting the marketing site. Host the bot separately.

Recommended Render setup:

1. Create a new Web Service from this GitHub repo.
2. Runtime: Node.
3. Build command:

```bash
npm ci && npm run bot:build
```

4. Start command:

```bash
npm run bot:start
```

5. Add the environment variables from `bot/.env.example`.
6. Use the Render public URL for `PUBLIC_BASE_URL` and the WhatsApp webhook URL.

Docker is also available via `bot/Dockerfile`.

## Commands Users Can Send

- `hi`, `hello`, `start`, `help` — greeting and instructions
- Paste chat text — receive a risk verdict
- Send screenshot/photo — vision analysis if OpenAI is enabled; otherwise the bot asks for pasted chat text
- `SCAM`, `SAFE`, `UNSURE` — report-back loop
- `DELETE` — remove active session and stored derived records matched to the sender hash

## MVP Limitations

- In-memory sessions are fine for one instance; use Redis/Supabase for multi-instance scaling.
- JSONL storage is acceptable for local/prototype use; use Postgres for a pilot.
- Image analysis is only active when OpenAI is configured. Dedicated AI-image/deepfake/reverse-image providers still need to be wired for full FR-7 through FR-10.
- This service gives signals, not proof. It deliberately avoids dossiers, surveillance, tracking, hacking, or private-account access.

## Pilot Checklist

- Set `USER_HASH_SALT` to a strong private value.
- Set `WHATSAPP_APP_SECRET` and keep signature verification enabled.
- Deploy over HTTPS.
- Configure Meta or Twilio webhook.
- Run `npm run bot:test` before each deploy.
- Test `hi`, a high-risk chat, `SCAM`, and `DELETE` from a real phone.
- Replace JSONL with Postgres before collecting real volume.
- Add an explicit privacy/retention policy page before a public launch.
