# Twilio Processing Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Twilio WhatsApp channel an immediate "🔎 Analyzing…" message followed by the verdict as a second message, matching the Meta path.

**Architecture:** The Twilio webhook returns the interim "analyzing" text synchronously via TwiML, then runs analysis and sends the verdict asynchronously via the Twilio REST API. Only analysis interactions (chat_text/image) get this split; instant commands keep replying synchronously. If Twilio REST credentials are absent, the path falls back to today's synchronous single-verdict behavior.

**Tech Stack:** TypeScript (NodeNext modules), Node 22 global `fetch`, bare `node:http`. No new dependencies.

## Global Constraints

- Node 22+, global `fetch` (no fetch polyfill, no new deps).
- Module system is NodeNext: **all relative imports use `.js` extensions** (even from `.ts` sources).
- Build: `npm run bot:build` (runs `tsc -p bot/tsconfig.json`). All `src/**/*.ts` compile to `bot/dist/`.
- Tests are standalone Node scripts using `node:assert/strict`, run via `node bot/dist/<name>.test.js` (same pattern as `smoke-test.ts`). No test framework.
- Interim message text is the EXISTING `analyzingMessage()` from `formatter.ts` — do not change its copy.
- `processIncomingMessage` in `bot.ts` MUST NOT change — it is the shared pure core.
- Graceful fallback: a missing `TWILIO_ACCOUNT_SID` or `TWILIO_AUTH_TOKEN` must degrade to synchronous behavior, never error.
- Setting `TWILIO_AUTH_TOKEN` also activates inbound signature verification (`verifyTwilioSignature`), which requires `PUBLIC_BASE_URL` to equal the deployed origin exactly.

---

### Task 1: Add Twilio REST config (accountSid, apiBase)

**Files:**
- Modify: `bot/src/config.ts` (BotConfig type ~lines 15-17, and `getConfig` twilio block ~lines 54-56)
- Test: `bot/src/config.test.ts` (create)

**Interfaces:**
- Produces: `config.twilio.accountSid?: string`, `config.twilio.apiBase: string` (default `"https://api.twilio.com"`), `config.twilio.authToken?: string` (unchanged).

- [ ] **Step 1: Write the failing test**

Create `bot/src/config.test.ts`:

```ts
import assert from "node:assert/strict";
import { getConfig } from "./config.js";

// apiBase defaults when env unset
delete process.env.TWILIO_API_BASE;
delete process.env.TWILIO_ACCOUNT_SID;
assert.equal(getConfig().twilio.apiBase, "https://api.twilio.com");
assert.equal(getConfig().twilio.accountSid, undefined);

// values are read from env
process.env.TWILIO_ACCOUNT_SID = "ACxxxx";
process.env.TWILIO_API_BASE = "http://127.0.0.1:9099";
assert.equal(getConfig().twilio.accountSid, "ACxxxx");
assert.equal(getConfig().twilio.apiBase, "http://127.0.0.1:9099");

console.log("config.test passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run bot:build && node bot/dist/config.test.js`
Expected: build fails with a TS error (`accountSid`/`apiBase` not on the twilio type), OR an assertion failure.

- [ ] **Step 3: Add the fields to the BotConfig type**

In `bot/src/config.ts`, change the `twilio` block of the `BotConfig` type from:

```ts
  twilio: {
    authToken?: string;
  };
```

to:

```ts
  twilio: {
    authToken?: string;
    accountSid?: string;
    apiBase: string;
  };
```

- [ ] **Step 4: Populate the fields in getConfig**

In `bot/src/config.ts`, change the `twilio` block inside the returned object from:

```ts
    twilio: {
      authToken: env("TWILIO_AUTH_TOKEN"),
    },
```

to:

```ts
    twilio: {
      authToken: env("TWILIO_AUTH_TOKEN"),
      accountSid: env("TWILIO_ACCOUNT_SID"),
      apiBase: env("TWILIO_API_BASE") ?? "https://api.twilio.com",
    },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run bot:build && node bot/dist/config.test.js`
Expected: prints `config.test passed`, exit 0.

- [ ] **Step 6: Commit**

```bash
git add bot/src/config.ts bot/src/config.test.ts
git commit -m "Add Twilio accountSid and apiBase to config"
```

---

### Task 2: Twilio REST sender and response planner

**Files:**
- Modify: `bot/src/twilio.ts`
- Test: `bot/src/twilio.test.ts` (create)

**Interfaces:**
- Consumes: `config.twilio.{accountSid,authToken,apiBase}` from Task 1; `InputKind` from `./types.js`; `BotConfig` from `./config.js`.
- Produces:
  - `planTwilioResponse(params: URLSearchParams, kind: InputKind, canAsync: boolean): TwilioPlan` where `TwilioPlan = { mode: "sync" } | { mode: "async"; channelTo: string; channelFrom: string }`. `channelFrom` = inbound `To` param (sandbox number), `channelTo` = inbound `From` param (user).
  - `sendTwilioWhatsApp(config: BotConfig, toRaw: string, fromRaw: string, body: string): Promise<void>` — POSTs to the Twilio Messages API; no-ops (warn log) when creds missing; throws on non-2xx.

- [ ] **Step 1: Write the failing test**

Create `bot/src/twilio.test.ts`:

```ts
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { planTwilioResponse, sendTwilioWhatsApp } from "./twilio.js";
import type { BotConfig } from "./config.js";

function paramsFrom(obj: Record<string, string>): URLSearchParams {
  return new URLSearchParams(obj);
}

// --- planTwilioResponse ---
const p = paramsFrom({ From: "whatsapp:+15551112222", To: "whatsapp:+14155238886" });

// async when analysis kind AND creds present
const asyncPlan = planTwilioResponse(p, "chat_text", true);
assert.equal(asyncPlan.mode, "async");
if (asyncPlan.mode === "async") {
  assert.equal(asyncPlan.channelTo, "whatsapp:+15551112222");   // reply goes to the user
  assert.equal(asyncPlan.channelFrom, "whatsapp:+14155238886"); // from the sandbox number
}

// image is also an analysis kind
assert.equal(planTwilioResponse(p, "image", true).mode, "async");

// sync when creds absent even for analysis kind
assert.equal(planTwilioResponse(p, "chat_text", false).mode, "sync");

// sync for instant kinds even with creds
assert.equal(planTwilioResponse(p, "greeting", true).mode, "sync");
assert.equal(planTwilioResponse(p, "delete_request", true).mode, "sync");

// --- sendTwilioWhatsApp: missing creds is a no-op (no throw, no request) ---
let stubHits = 0;
const noCredsConfig = { twilio: { apiBase: "http://127.0.0.1:1", accountSid: undefined, authToken: undefined } } as unknown as BotConfig;
await sendTwilioWhatsApp(noCredsConfig, "whatsapp:+1", "whatsapp:+2", "hi"); // must not throw

// --- sendTwilioWhatsApp: constructs the right request ---
let captured: { method?: string; url?: string; auth?: string; body?: string } = {};
const stub = createServer((req, res) => {
  stubHits += 1;
  const chunks: Buffer[] = [];
  req.on("data", (c) => chunks.push(c as Buffer));
  req.on("end", () => {
    captured = {
      method: req.method,
      url: req.url,
      auth: req.headers.authorization,
      body: Buffer.concat(chunks).toString("utf8"),
    };
    res.writeHead(201, { "content-type": "application/json" });
    res.end("{}");
  });
});
await new Promise<void>((resolve) => stub.listen(0, "127.0.0.1", () => resolve()));
const port = (stub.address() as AddressInfo).port;

const config = {
  twilio: { accountSid: "ACtest", authToken: "tok", apiBase: `http://127.0.0.1:${port}` },
} as unknown as BotConfig;

await sendTwilioWhatsApp(config, "whatsapp:+15551112222", "whatsapp:+14155238886", "hello world");
stub.close();

assert.equal(stubHits, 1);
assert.equal(captured.method, "POST");
assert.equal(captured.url, "/2010-04-01/Accounts/ACtest/Messages.json");
assert.equal(captured.auth, `Basic ${Buffer.from("ACtest:tok").toString("base64")}`);
const form = new URLSearchParams(captured.body ?? "");
assert.equal(form.get("From"), "whatsapp:+14155238886");
assert.equal(form.get("To"), "whatsapp:+15551112222");
assert.equal(form.get("Body"), "hello world");

// --- sendTwilioWhatsApp: throws on non-2xx ---
const errStub = createServer((req, res) => { res.writeHead(401); res.end("nope"); });
await new Promise<void>((resolve) => errStub.listen(0, "127.0.0.1", () => resolve()));
const errPort = (errStub.address() as AddressInfo).port;
const errConfig = { twilio: { accountSid: "ACtest", authToken: "tok", apiBase: `http://127.0.0.1:${errPort}` } } as unknown as BotConfig;
await assert.rejects(() => sendTwilioWhatsApp(errConfig, "whatsapp:+1", "whatsapp:+2", "x"), /Twilio send failed: 401/);
errStub.close();

console.log("twilio.test passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run bot:build && node bot/dist/twilio.test.js`
Expected: build fails (`planTwilioResponse`/`sendTwilioWhatsApp` not exported).

- [ ] **Step 3: Implement in `bot/src/twilio.ts`**

Add the import line at the top (after the existing imports):

```ts
import type { BotConfig } from "./config.js";
import type { BotMessage, InputKind } from "./types.js";
```

(The file already imports `BotMessage` from `./types.js` — merge `InputKind` into that existing import and remove any duplicate.)

Append to the end of `bot/src/twilio.ts`:

```ts
export type TwilioPlan =
  | { mode: "sync" }
  | { mode: "async"; channelTo: string; channelFrom: string };

export function planTwilioResponse(
  params: URLSearchParams,
  kind: InputKind,
  canAsync: boolean,
): TwilioPlan {
  const isAnalyze = kind === "chat_text" || kind === "image";
  if (isAnalyze && canAsync) {
    return {
      mode: "async",
      channelTo: params.get("From") ?? "",
      channelFrom: params.get("To") ?? "",
    };
  }
  return { mode: "sync" };
}

export async function sendTwilioWhatsApp(
  config: BotConfig,
  toRaw: string,
  fromRaw: string,
  body: string,
): Promise<void> {
  const { accountSid, authToken, apiBase } = config.twilio;
  if (!accountSid || !authToken) {
    console.log(JSON.stringify({
      level: "warn",
      event: "twilio_send_skipped",
      reason: "missing_credentials",
      to: toRaw,
    }));
    return;
  }

  const url = `${apiBase}/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const form = new URLSearchParams({ From: fromRaw, To: toRaw, Body: body });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio send failed: ${response.status} ${errorText.slice(0, 500)}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run bot:build && node bot/dist/twilio.test.js`
Expected: prints `twilio.test passed`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add bot/src/twilio.ts bot/src/twilio.test.ts
git commit -m "Add Twilio REST sender and response planner"
```

---

### Task 3: Wire the Twilio webhook to the async ack-then-verdict flow

**Files:**
- Modify: `bot/src/index.ts` (imports near top; the `POST /twilio/webhook` block ~lines 78-90)
- Test: regression via `npm run bot:test`; integration via the manual script in Step 5.

**Interfaces:**
- Consumes: `planTwilioResponse`, `sendTwilioWhatsApp` (Task 2); `classifyMessage` from `./classifier.js`; `analyzingMessage` from `./formatter.js`; existing `processIncomingMessage`, `parseTwilioMessage`, `twimlMessage`, `verifyTwilioSignature`.

- [ ] **Step 1: Add imports**

In `bot/src/index.ts`, update the imports:

- Add to the `./twilio.js` import so it reads:
```ts
import { parseTwilioMessage, planTwilioResponse, sendTwilioWhatsApp, twimlMessage } from "./twilio.js";
```
- Add two new import lines:
```ts
import { classifyMessage } from "./classifier.js";
import { analyzingMessage } from "./formatter.js";
```

- [ ] **Step 2: Replace the `/twilio/webhook` handler body**

In `bot/src/index.ts`, replace these lines (the two lines after the signature check inside the `POST /twilio/webhook` block):

```ts
      const replies = await processIncomingMessage(runtime, parseTwilioMessage(params));
      return textResponse(res, 200, twimlMessage(replies.join("\n\n")), "text/xml; charset=utf-8");
```

with:

```ts
      const message = parseTwilioMessage(params);
      const canAsync = Boolean(config.twilio.accountSid && config.twilio.authToken);
      const plan = planTwilioResponse(params, classifyMessage(message), canAsync);

      if (plan.mode === "async") {
        textResponse(res, 200, twimlMessage(analyzingMessage()), "text/xml; charset=utf-8");
        void processIncomingMessage(runtime, message)
          .then((replies) => Promise.all(
            replies.map((reply) => sendTwilioWhatsApp(config, plan.channelTo, plan.channelFrom, reply)),
          ))
          .catch((error) => {
            console.error(JSON.stringify({
              level: "error",
              event: "twilio_async_processing_failed",
              message: error instanceof Error ? error.message : String(error),
            }));
          });
        return;
      }

      const replies = await processIncomingMessage(runtime, message);
      return textResponse(res, 200, twimlMessage(replies.join("\n\n")), "text/xml; charset=utf-8");
```

- [ ] **Step 3: Build and run the regression smoke test**

Run: `npm run bot:test`
Expected: ends with `Smoke test passed` (the shared core is unchanged).

- [ ] **Step 4: Confirm the sync fallback path still answers (no creds)**

Run in one terminal:
```bash
npm run bot:build
HOST=127.0.0.1 PORT=8790 USER_HASH_SALT=dev node bot/dist/index.js
```
In another terminal (no Twilio creds set → `canAsync` is false → sync path):
```bash
curl -s -X POST http://127.0.0.1:8790/twilio/webhook \
  -H "content-type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+15551112222" \
  --data-urlencode "To=whatsapp:+14155238886" \
  --data-urlencode "Body=He says he loves me and wants me to send a gift card for his flight"
```
Expected: a single TwiML `<Response><Message>…HIGH risk…</Message></Response>`. Stop the server (Ctrl-C).

- [ ] **Step 5: Integration-test the async path with a signed request + stub Twilio API**

Save this as `/tmp/twilio-async-check.mjs`:

```js
import { createServer } from "node:http";
import { createHmac } from "node:crypto";

const BOT = "http://127.0.0.1:8790";
const AUTH_TOKEN = "tok";

// Stub Twilio REST API: capture the outbound verdict.
let captured = null;
const stub = createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    captured = { url: req.url, body: Buffer.concat(chunks).toString("utf8") };
    res.writeHead(201, { "content-type": "application/json" });
    res.end("{}");
  });
});
await new Promise((r) => stub.listen(9099, "127.0.0.1", r));

// Build + sign the inbound webhook exactly like Twilio does.
const url = `${BOT}/twilio/webhook`;
const fields = {
  From: "whatsapp:+15551112222",
  To: "whatsapp:+14155238886",
  Body: "He says he loves me and wants me to send a gift card for his flight",
};
const sorted = Object.keys(fields).sort();
const payload = sorted.reduce((acc, k) => acc + k + fields[k], url);
const signature = createHmac("sha1", AUTH_TOKEN).update(payload).digest("base64");

const resp = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", "x-twilio-signature": signature },
  body: new URLSearchParams(fields).toString(),
});
const twiml = await resp.text();
console.log("immediate TwiML:", twiml);

await new Promise((r) => setTimeout(r, 1500)); // let async send land
console.log("stub received:", captured);
stub.close();

if (!twiml.includes("Analyzing")) throw new Error("expected immediate Analyzing message");
if (!captured || !captured.body.includes("HIGH risk")) throw new Error("expected async HIGH risk verdict");
if (!captured.url.includes("/Messages.json")) throw new Error("expected Twilio Messages.json call");
console.log("async path OK");
```

Run the bot with creds pointed at the stub, then the check:
```bash
npm run bot:build
HOST=127.0.0.1 PORT=8790 USER_HASH_SALT=dev \
TWILIO_ACCOUNT_SID=ACtest TWILIO_AUTH_TOKEN=tok \
TWILIO_API_BASE=http://127.0.0.1:9099 PUBLIC_BASE_URL=http://127.0.0.1:8790 \
node bot/dist/index.js &
sleep 1
node /tmp/twilio-async-check.mjs
kill %1
```
Expected: prints `immediate TwiML:` containing "🔎 Analyzing…", `stub received:` with a body containing "HIGH risk", and finally `async path OK`.

- [ ] **Step 6: Commit**

```bash
git add bot/src/index.ts
git commit -m "Send Twilio interim analyzing message, verdict via REST"
```

---

### Task 4: Document the new env vars and keep-warm note

**Files:**
- Modify: `bot/README.md` (the "Environment Variables" and "Twilio Sandbox Wiring" sections)
- Modify: `bot/.env.example`

**Interfaces:** none (docs only).

- [ ] **Step 1: Add the vars to `bot/.env.example`**

In `bot/.env.example`, replace the Twilio block:

```
# Twilio sandbox fallback
TWILIO_AUTH_TOKEN=
```

with:

```
# Twilio sandbox (set ACCOUNT_SID + AUTH_TOKEN to enable the "Analyzing..." + verdict
# two-message flow and inbound signature verification). API_BASE override is for tests only.
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_API_BASE=https://api.twilio.com
```

- [ ] **Step 2: Document in `bot/README.md`**

In `bot/README.md`, under the "Optional Twilio sandbox:" list in the Environment Variables section, replace:

```
- `TWILIO_AUTH_TOKEN`
```

with:

```
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
```

Then append this paragraph to the "Twilio Sandbox Wiring" section:

```markdown
### Interim "Analyzing…" message

When `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are both set, the bot replies to a chat or
screenshot with an immediate "🔎 Analyzing…" message (synchronous TwiML), then sends the verdict
as a second message via the Twilio REST API. Without these credentials it falls back to a single
synchronous verdict reply. `PUBLIC_BASE_URL` must match the deployed origin exactly so inbound
signature verification passes.

**Keep-warm:** on Render's free tier the service sleeps after ~15 minutes idle and a cold start can
take ~30s — long enough that the verdict lands well after "Analyzing…". Keep it warm with a cron
ping to `/health` every ~10 minutes (a free uptime pinger or a scheduled GitHub Action).
```

- [ ] **Step 3: Commit**

```bash
git add bot/README.md bot/.env.example
git commit -m "Document Twilio REST credentials and keep-warm note"
```

---

## Deployment (after all tasks merge to main)

1. In Render → `veritas-bot` → Environment, add: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (both from Twilio Console), and `PUBLIC_BASE_URL=https://veritas-bot.onrender.com`. Save (auto-redeploys).
2. Manual end-to-end test over real WhatsApp: send a scam line to the sandbox number → "🔎 Analyzing…" arrives immediately, verdict follows.
3. (Recommended) Set up the keep-warm `/health` ping.
```
