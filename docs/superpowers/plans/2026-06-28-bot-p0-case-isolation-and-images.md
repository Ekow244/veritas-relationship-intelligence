# Bot P0 Fixes: Case Isolation + Real Image Analysis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two P0 correctness bugs: (1) conversation state bleeds across unrelated submissions, and (2) inbound images are never analyzed (verdicts come from stale history instead of the image).

**Architecture:** Introduce a discrete "case" on the session — a new pasted chat or image starts a fresh case (clearing prior analysis context); only short follow-up replies append. `analyzeSession` then analyzes only the current case. Parse and hydrate all Twilio media (`NumMedia`/`MediaUrl{n}`) into the message, send every case image to the vision model, and reply with a clear error when an image can't be read instead of falling through to history.

**Tech Stack:** TypeScript (NodeNext), Node 22 global `fetch`, bare `node:http`. Tests are standalone `node:assert/strict` scripts run via `npm run bot:test` (no framework).

## Global Constraints

- NodeNext modules: **all relative imports use `.js` extensions**.
- Build: `npm run bot:build`; tests via `node bot/dist/<name>.test.js`, chained into `bot:test`. `bot/dist/` is gitignored — commit only `bot/src/*`.
- No new dependencies.
- Risk labels and the verdict header are rendered from code templates (already true in `formatter.ts`) — do not move them to model free-text.
- Out of scope (owner handling separately): production WhatsApp number, data-retention/security.
- **Spec contradiction resolution (binding for this plan):** after a verdict, a *short* text reply (≤ 60 chars, no chat markers) appends to the current case as a follow-up; **any image, or a substantial/new chat_text, starts a FRESH case.** This prevents back-to-back unrelated pastes from bleeding (regression test #6) while still letting "yeah, he also asked for crypto" augment.

---

### Task 1: Parse and hydrate ALL Twilio media

**Files:**
- Modify: `bot/src/types.ts` (add `images?: ImageRef[]` to `BotMessage` and `SessionInput`; export `ImageRef`)
- Modify: `bot/src/twilio.ts` (`parseTwilioMessage` reads `NumMedia`; new `hydrateTwilioImages`)
- Test: `bot/src/twilio.test.ts` (extend)

**Interfaces produced:**
- `type ImageRef = { id?: string; url?: string; mimeType?: string; caption?: string; dataUrl?: string }`
- `BotMessage.images?: ImageRef[]`, `SessionInput.images?: ImageRef[]`
- `hydrateTwilioImages(config: BotConfig, message: BotMessage): Promise<BotMessage>` — downloads every `images[].url` (Twilio Basic auth) into `dataUrl`; on a per-image fetch failure leaves that image without `dataUrl`. Returns a new message.

- [ ] **Step 1: Write failing tests** — append to `bot/src/twilio.test.ts` before the final `console.log("twilio.test passed")`:

```ts
  // --- parseTwilioMessage reads NumMedia into images[] ---
  const media2 = parseTwilioMessage(new URLSearchParams({
    From: "whatsapp:+1", To: "whatsapp:+2", Body: "look at these", NumMedia: "2",
    MediaUrl0: "http://m/0", MediaContentType0: "image/jpeg",
    MediaUrl1: "http://m/1", MediaContentType1: "image/png",
  }));
  assert.equal(media2.images?.length, 2);
  assert.equal(media2.images?.[0].url, "http://m/0");
  assert.equal(media2.images?.[1].mimeType, "image/png");
  assert.equal(media2.images?.[0].caption, "look at these");

  // text-only message has no images
  const textOnly = parseTwilioMessage(new URLSearchParams({ From: "whatsapp:+1", To: "whatsapp:+2", Body: "hi" }));
  assert.equal(textOnly.images, undefined);

  // --- hydrateTwilioImages downloads each url with Basic auth ---
  let mediaCalls = 0; const seenAuth = [];
  const mStub = createServer((req, res) => { mediaCalls++; seenAuth.push(req.headers.authorization); res.writeHead(200, {"content-type":"image/png"}); res.end(Buffer.from([0x89,0x50])); });
  await new Promise((r) => mStub.listen(0, "127.0.0.1", () => r()));
  const mPort = (mStub.address()).port;
  const mCfg = { twilio: { accountSid: "ACx", authToken: "tok", apiBase: "http://x" } };
  const hy = await hydrateTwilioImages(mCfg, { provider: "twilio", from: "x", timestamp: 0, images: [ {url:`http://127.0.0.1:${mPort}/a`}, {url:`http://127.0.0.1:${mPort}/b`} ] });
  mStub.close();
  assert.equal(mediaCalls, 2);
  assert.equal(seenAuth[0], `Basic ${Buffer.from("ACx:tok").toString("base64")}`);
  assert.ok(hy.images?.[0].dataUrl?.startsWith("data:image/png;base64,"));
  assert.ok(hy.images?.[1].dataUrl?.startsWith("data:image/png;base64,"));
```
(Add `import { hydrateTwilioImages } from "./twilio.js";` to the existing import.)

- [ ] **Step 2: Run to verify failure** — `npm run bot:build && node bot/dist/twilio.test.js`. Expected: build error (`hydrateTwilioImages`/`images` not defined) or assertion failure.

- [ ] **Step 3: Add types** — in `bot/src/types.ts`, add and wire `ImageRef`:

```ts
export type ImageRef = {
  id?: string;
  url?: string;
  mimeType?: string;
  caption?: string;
  dataUrl?: string;
};
```
Change `BotMessage.image?: {...}` to reference it and add `images`:
```ts
  image?: ImageRef;
  images?: ImageRef[];
```
And add `images?: ImageRef[];` to `SessionInput` (keep its existing `image?`).

- [ ] **Step 4: Parse NumMedia in `parseTwilioMessage`** — replace the single-media block so it builds `images[]`:

```ts
export function parseTwilioMessage(params: URLSearchParams): BotMessage {
  const body = params.get("Body") ?? undefined;
  const from = params.get("From")?.replace(/^whatsapp:/, "") ?? "unknown";
  const numMedia = Number.parseInt(params.get("NumMedia") ?? "0", 10) || 0;

  const images: ImageRef[] = [];
  for (let i = 0; i < numMedia; i++) {
    const url = params.get(`MediaUrl${i}`);
    if (!url) continue;
    images.push({ url, mimeType: params.get(`MediaContentType${i}`) ?? undefined, caption: body });
  }

  return {
    provider: "twilio",
    from,
    id: params.get("SmsMessageSid") ?? undefined,
    timestamp: Date.now(),
    text: body,
    image: images[0],
    images: images.length ? images : undefined,
  };
}
```
(Add `ImageRef` to the `./types.js` import in `twilio.ts`.)

- [ ] **Step 5: Add `hydrateTwilioImages`** — in `bot/src/twilio.ts`, replace the existing `hydrateTwilioImage` with a multi-image version (keep the name `hydrateTwilioImages`):

```ts
export async function hydrateTwilioImages(config: BotConfig, message: BotMessage): Promise<BotMessage> {
  const images = message.images ?? (message.image ? [message.image] : []);
  if (!images.length) return message;

  const { accountSid, authToken } = config.twilio;
  if (!accountSid || !authToken) return message;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const hydrated = await Promise.all(images.map(async (img) => {
    if (!img.url || img.dataUrl) return img;
    try {
      const res = await fetch(img.url, { headers: { authorization: `Basic ${auth}` } });
      if (!res.ok) return img;
      const contentType = res.headers.get("content-type") ?? img.mimeType ?? "image/jpeg";
      const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
      return { ...img, mimeType: contentType, dataUrl: `data:${contentType};base64,${base64}` };
    } catch {
      return img;
    }
  }));

  return { ...message, images: hydrated, image: hydrated[0] };
}
```
Update the import in `bot/src/index.ts`: change `hydrateTwilioImage` → `hydrateTwilioImages`, and in the Twilio async branch call `hydrateTwilioImages(config, message)`.

- [ ] **Step 6: Run tests** — `npm run bot:test`. Expected: all suites pass, including the new media assertions.

- [ ] **Step 7: Commit**
```bash
git add bot/src/types.ts bot/src/twilio.ts bot/src/twilio.test.ts bot/src/index.ts
git commit -m "Parse and hydrate all Twilio media into images[]"
```

---

### Task 2: Case isolation (fix state bleed)

**Files:**
- Modify: `bot/src/types.ts` (add `stage` to `Session`)
- Modify: `bot/src/session-store.ts` (add `startCase`, `setStage`)
- Modify: `bot/src/bot.ts` (route new-case vs append vs screening-answer; analyze only current case)
- Test: `bot/src/clarify.test.ts` (extend) — covers regression #6 and screening append

**Interfaces:**
- Consumes: `ImageRef`, `images` (Task 1).
- Produces: `Session.stage?: "awaiting_screening" | "verdict_done"`; `SessionStore.startCase(userRef, input): Session` (resets `inputs` to `[input]`, sets `stage` undefined, `clarifierAsked` false); `SessionStore.setStage(userRef, stage)`.

- [ ] **Step 1: Write failing test** — append to `bot/src/clarify.test.ts` before its final `console.log`:

```ts
  // --- case isolation: case B must not inherit case A ---
  await send("+iso", { text: "David is an oil rig engineer and asked me for 800 dollars in iTunes gift cards" });
  // (verdict or screening question for case A — either way case A is established)
  await send("+iso", { text: "yes" }); // answer any screening -> verdict for A
  // New, unrelated, substantial submission = fresh case
  await send("+iso", { text: "Marcus is a military surgeon in Syria who needs 1275 dollars in Steam gift cards" });
  const sess = runtime.sessions.get(require_userref("+iso")); // see helper note below
  const caseText = sess.inputs.filter(i => i.text).map(i => i.text).join(" ");
  assert.ok(caseText.includes("Marcus"), "current case should contain the new submission");
  assert.ok(!caseText.includes("David"), "current case must NOT contain the prior unrelated case");
```
Helper: the session is keyed by `hashUser(from, salt)`. Add near the top of the test file:
```ts
import { hashUser } from "./utils.js";
function require_userref(from){ return hashUser(from, config.userHashSalt); }
```

- [ ] **Step 2: Run to verify failure** — `npm run bot:build && node bot/dist/clarify.test.js`. Expected: assertion fails — `caseText` still contains "David" (bleed).

- [ ] **Step 3: Add `stage` to Session** — in `types.ts` `Session`, add:
```ts
  stage?: "awaiting_screening" | "verdict_done";
```

- [ ] **Step 4: Add SessionStore methods** — in `session-store.ts`:
```ts
  startCase(userRef: string, input: SessionInput): Session {
    const session = this.get(userRef);
    session.inputs = [input];
    session.stage = undefined;
    session.clarifierAsked = false;
    session.updatedAt = Date.now();
    this.sessions.set(userRef, session);
    return session;
  }

  setStage(userRef: string, stage: Session["stage"]): void {
    const session = this.get(userRef);
    session.stage = stage;
    session.updatedAt = Date.now();
  }
```

- [ ] **Step 5: Route case lifecycle in `bot.ts`** — first add `Session` to the `./types.js` type import at the top of `bot.ts` (it currently imports `BotMessage, InputKind, SessionInput, StoredCase, StoredReport`). Then, in `processIncomingMessage`, replace the block starting at `const input = toSessionInput(kind, message);` and the `runtime.sessions.addInput(...)` line with case-aware routing:

```ts
  const input = toSessionInput(kind, message);
  const hasImage = Boolean(message.images?.some((i) => i.dataUrl) || message.image?.dataUrl);
  const shortText = (message.text ?? "").trim().length <= 60 && !/\n/.test(message.text ?? "");

  let updated: Session;
  if (session.stage === "awaiting_screening") {
    // the screening answer continues the current case
    updated = runtime.sessions.addInput(userRef, input);
  } else if (session.stage === "verdict_done" && shortText && !hasImage) {
    // a short follow-up augments the just-finished case
    updated = runtime.sessions.addInput(userRef, input);
  } else {
    // new primary submission (or first message) = fresh case
    updated = runtime.sessions.startCase(userRef, input);
  }
```
Then, at each point the function currently `return [askForMoreMessage()]` / asks the clarify question / returns the verdict, set the stage:
- Where it asks the before-question (`return [clarifyQuestion(missing)];`): immediately before, add `runtime.sessions.setStage(userRef, "awaiting_screening");` (keep `markClarifierAsked`).
- Where it returns the verdict (`return [formatVerdict(verdict), followUpMessage()];`): immediately before the return, add `runtime.sessions.setStage(userRef, "verdict_done");`.

`analyzeSession` already reads `session.inputs`; because a new case resets `inputs`, it now analyzes only the current case — no code change needed in `analyzer.ts` for text bleed.

- [ ] **Step 6: Run tests** — `npm run bot:test`. Expected: all pass; the new isolation assertion passes (case B has Marcus, not David).

- [ ] **Step 7: Commit**
```bash
git add bot/src/types.ts bot/src/session-store.ts bot/src/bot.ts bot/src/clarify.test.ts
git commit -m "Isolate each submission as a fresh case (fix state bleed)"
```

---

### Task 3: Analyze images (all of them), distinctly, with clear failure handling

**Files:**
- Modify: `bot/src/openai-analyzer.ts` (`analyzeWithOpenAI` accepts multiple image data URLs; profile-photo guidance; new testable `buildContent` helper)
- Modify: `bot/src/analyzer.ts` (collect ALL current-case images; pass to analyzer)
- Modify: `bot/src/bot.ts` (image-can't-be-read reply; don't fall through to history)
- Modify: `bot/src/formatter.ts` (reverse-image-search note for profile photos)
- Test: `bot/src/openai-analyzer.test.ts` (create) — unit-test `buildContent`

**Interfaces:**
- Consumes: `images`/`ImageRef` (Task 1), current-case `inputs` (Task 2).
- Produces: `buildContent(text: string | undefined, imageDataUrls: string[]): Array<Record<string, unknown>>` exported from `openai-analyzer.ts`; `analyzeWithOpenAI(config, { text?, imageDataUrls? })`.

- [ ] **Step 1: Write failing test** — create `bot/src/openai-analyzer.test.ts`:
```ts
import assert from "node:assert/strict";
import { buildContent } from "./openai-analyzer.js";

// text only
let c = buildContent("hello", []);
assert.equal(c.length, 1);
assert.equal(c[0].type, "input_text");

// multiple images + text -> one text part + one input_image per image
c = buildContent("caption", ["data:image/png;base64,AAA", "data:image/png;base64,BBB"]);
assert.equal(c.filter((p) => p.type === "input_image").length, 2);
assert.equal(c.filter((p) => p.type === "input_text").length, 1);

// images only (no text)
c = buildContent(undefined, ["data:image/png;base64,AAA"]);
assert.equal(c.length, 1);
assert.equal(c[0].type, "input_image");

console.log("openai-analyzer.test passed");
```
Add `node bot/dist/openai-analyzer.test.js` to the `bot:test` chain in `package.json` (before `smoke-test.js`).

- [ ] **Step 2: Run to verify failure** — `npm run bot:build && node bot/dist/openai-analyzer.test.js`. Expected: build error (`buildContent` not exported).

- [ ] **Step 3: Extract + export `buildContent`; accept multiple images** — in `openai-analyzer.ts`, add:
```ts
export function buildContent(text: string | undefined, imageDataUrls: string[]): Array<Record<string, unknown>> {
  const content: Array<Record<string, unknown>> = [];
  if (text) content.push({ type: "input_text", text });
  for (const url of imageDataUrls) content.push({ type: "input_image", image_url: url });
  return content;
}
```
Change `analyzeWithOpenAI`'s input type to `{ text?: string; imageDataUrls?: string[] }` and replace its inline content-building with `const content = buildContent(input.text, input.imageDataUrls ?? []);` (keep the existing `if (content.length === 0) return undefined;`).

- [ ] **Step 4: Add profile-photo guidance to the system prompt** — append to the existing `systemPrompt` string in `openai-analyzer.ts`:
```
If the image is a single profile photo rather than a chat screenshot, describe what is visible and only flag generic signals with visible evidence (stock-photo/model look, military or uniform prop, watermark, mismatched metadata). Do not claim reverse-image-search results — that is not available.
```

- [ ] **Step 5: Pass all current-case images in `analyzer.ts`** — replace the `latestImage` line and the `analyzeWithOpenAI` call:
```ts
  const caseImages = session.inputs
    .flatMap((i) => i.images ?? (i.image ? [i.image] : []))
    .filter((img) => img.dataUrl);
  const imageDataUrls = caseImages.map((img) => img.dataUrl as string);
  const captionText = caseImages.map((img) => img.caption).filter(Boolean).join("\n");
```
and:
```ts
    const llm = await analyzeWithOpenAI(config, {
      text: text || captionText || undefined,
      imageDataUrls,
    });
```
Update the `if (latestImage && !config.openai.enabled)` guard to `if (caseImages.length && !config.openai.enabled)`.

- [ ] **Step 6: Image-can't-be-read reply in `bot.ts`** — right after the image-vision gate (`imageNeedsVisionMessage`) and before the readiness gate, add: if the message carried image(s) but none hydrated, and there's no usable text, reply with a clear error instead of analyzing:
```ts
  const inboundImages = message.images ?? (message.image ? [message.image] : []);
  const anyImageHydrated = inboundImages.some((i) => i.dataUrl);
  if (inboundImages.length && !anyImageHydrated && !(message.text ?? "").trim()) {
    return [imageUnreadableMessage()];
  }
```
Add to `formatter.ts`:
```ts
export function imageUnreadableMessage(): string {
  return "📷 I couldn’t open that image — please try resending it as a photo.";
}
```
and import `imageUnreadableMessage` in `bot.ts`.

- [ ] **Step 7: Run tests** — `npm run bot:test`. Expected: all suites pass.

- [ ] **Step 8: Commit**
```bash
git add bot/src/openai-analyzer.ts bot/src/openai-analyzer.test.ts bot/src/analyzer.ts bot/src/bot.ts bot/src/formatter.ts package.json
git commit -m "Analyze all case images via vision; clear image-read failure message"
```

---

## Manual verification (after all tasks, before merge)

With OpenAI enabled locally (real key) and Twilio REST creds + `TWILIO_API_BASE` pointed at a stub, run a signed webhook with `NumMedia=1` and a fresh scammer screenshot; confirm the verdict quotes that image's details and not any earlier text. Also run two unrelated text submissions back-to-back and confirm the second verdict contains zero content from the first.

## Test checklist coverage (this plan)
- #1 image scam quotes image details → Task 3 (manual, needs live vision) + Task 1/3 wiring.
- #6 case isolation, no bleed → Task 2 automated test.
- Multi-image + text+image → Task 1 + Task 3 `buildContent`.
- Image-read failure → Task 3 Step 6.
(Items #2 benign image, #3 profile photo, #4 screening skip, #5 calibration, #7 free-text answer, #8 templated label, #9 error fallback, #10 action steps belong to the **P1/P2 plan** that follows.)
