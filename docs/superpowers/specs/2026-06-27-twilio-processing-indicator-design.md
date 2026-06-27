# Twilio Processing Indicator — Design

**Date:** 2026-06-27
**Status:** Approved (pending spec review)

## Problem

When a user sends a chat or screenshot to the Veritas WhatsApp bot, analysis can take
several seconds (OpenAI call) — and much longer on a Render free-tier cold start (~30s).
On the **Twilio sandbox** channel the user gets *no feedback* during this wait: the Twilio
path replies with synchronous TwiML, which can carry only **one** message returned after all
processing finishes. The user stares at silence and assumes the bot is broken.

The **Meta Cloud API** path already handles this: it 200s the webhook, sends an immediate
"analyzing" message, then sends the verdict separately (`processMetaMessageForWhatsApp`).

Goal: give Twilio the same two-part "🔎 Analyzing… → verdict" experience, so the cue is
consistent on both channels. Cue form: an **interim text message** (not the native typing
indicator, which Twilio can't do and which expires before a cold start finishes).

## Constraint that drives the design

TwiML can return exactly one message per webhook response. To send a *second* message (the
verdict, after "analyzing"), the bot must call Twilio's **REST API**, which requires
`TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`. There is no TwiML-only way to do two messages.

## Approach (selected: A)

Interim message via **TwiML** (synchronous, guaranteed, no new infra), verdict via **REST API**
(async, after the webhook response). Only the slow interactions get this treatment; instant
commands keep replying synchronously as today.

### Message flow

```
Inbound Twilio webhook
  → verify signature → parse → classify(kind)

  ├─ kind is chat_text / image  AND  Twilio REST creds present:
  │     1. respond NOW with TwiML  → analyzingMessage()        (instant, guaranteed)
  │     2. async (after response):  processIncomingMessage()   → verdict reply(s)
  │     3. send each verdict reply to the user via Twilio REST API
  │
  └─ everything else (greeting, DELETE, SCAM/SAFE/UNSURE, crisis, scope_violation,
     out_of_scope, "need more", unknown):
        respond synchronously with TwiML as today (already instant — no REST call)
```

**Graceful fallback:** if `accountSid` or `authToken` is missing, the chat_text/image branch
also falls back to synchronous TwiML (analyze, then return the verdict in one reply) — exactly
today's behavior. A missing env var degrades cleanly; it never breaks the bot.

### Why only chat_text / image get the async split

Those are the only kinds that invoke analysis (and the OpenAI call). Every other kind returns
a canned string instantly, so a synchronous TwiML reply is already a good experience and needs
no REST call.

### Note on `askForMore`

If a chat_text/image message lacks enough content, `processIncomingMessage` returns
`askForMoreMessage()` instead of a verdict. In the async path the user will then see
"Analyzing…" followed by "I need a little more…". This matches the existing Meta behavior and
is acceptable for the MVP.

## Components / code changes

| File | Change |
|---|---|
| `bot/src/config.ts` | Add `twilio.accountSid` from env `TWILIO_ACCOUNT_SID`. `authToken` already exists. |
| `bot/src/twilio.ts` | Add `sendTwilioWhatsApp(config, toRaw, fromRaw, body)` — POST form-encoded `From`/`To`/`Body` to `https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json` with HTTP Basic auth (`AccountSid:AuthToken`). Throw on non-2xx with a truncated error body. |
| `bot/src/index.ts` | Rework `POST /twilio/webhook`: after signature check + parse, classify; if chat_text/image and REST creds present, respond with `twimlMessage(analyzingMessage())` then async `processIncomingMessage` → `sendTwilioWhatsApp` per reply; else synchronous TwiML as today. Capture inbound `To` (sandbox number) to use as the REST `From`. |
| `bot/src/bot.ts` | No change. `processIncomingMessage` stays the pure core both channels call. Meta path untouched. |

No new dependencies. Reuses global `fetch` and existing `verifyTwilioSignature`.

### Twilio REST send details

- Endpoint: `POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json`
- Auth header: `Authorization: Basic base64("{AccountSid}:{AuthToken}")`
- Body (`application/x-www-form-urlencoded`): `From` = inbound `To` (sandbox number, already
  `whatsapp:+...`), `To` = inbound `From` (already `whatsapp:+...`), `Body` = reply text.
- The inbound `From`/`To` params are passed raw (with `whatsapp:` prefix) into the sender so no
  prefix juggling is needed.

## Configuration & ops

New Render env vars:

- `TWILIO_ACCOUNT_SID` — from Twilio Console.
- `TWILIO_AUTH_TOKEN` — from Twilio Console. Setting this also **enables inbound webhook
  signature verification** (`verifyTwilioSignature`).
- `PUBLIC_BASE_URL=https://veritas-bot.onrender.com` — **must match the Render origin exactly**,
  or signature reconstruction fails and webhooks 401.

**Keep-warm (recommended, not code):** Render free tier sleeps after ~15 min idle; a cold start
(~30s) makes the verdict arrive long after "Analyzing…". Recommend a cron ping to `/health`
every ~10 min (free uptime pinger or a GitHub Action) to keep the service warm. Documented as
an operational note; no code change.

## Error handling

- Async REST send failure: caught and logged as a structured JSON error event (same pattern as
  the Meta path's `meta_webhook_processing_failed`). The user has already seen "Analyzing…";
  the failure is visible in logs.
- Twilio's ~15s webhook timeout is a non-issue: the webhook responds instantly with TwiML.
- Missing REST creds: synchronous fallback (see above).

## Testing

- `npm run bot:test` (smoke) is unaffected — it calls `processIncomingMessage` directly.
- Sync-fallback branch is what runs locally without creds; verifiable via `POST /simulate`.
- The async two-message path is verified with a final manual test over real WhatsApp after
  deploy: send a scam line, confirm "Analyzing…" arrives immediately and the verdict follows.

## Out of scope

- Native WhatsApp typing indicator (Twilio can't; Meta-only; expires ~25s).
- Changing the Meta path (already acks).
- Replacing JSONL storage, multi-instance session store — unrelated.
