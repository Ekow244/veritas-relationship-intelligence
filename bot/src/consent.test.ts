import assert from "node:assert/strict";
import { getConfig } from "./config.js";
import { processIncomingMessage } from "./bot.js";
import { SessionStore } from "./session-store.js";
import { DataStore } from "./storage.js";
import type { BotMessage } from "./types.js";

const config = { ...getConfig(), dataDir: "/tmp/veritas-consent", requireConsent: true };
const runtime = { config, sessions: new SessionStore(config.sessionTtlMs), data: new DataStore(config.dataDir) };
const send = (from: string, fields: Partial<BotMessage>) =>
  processIncomingMessage(runtime, { provider: "twilio", from, timestamp: Date.now(), ...fields });

(async () => {
  // 1. Before consent, any substantive message returns the consent gate (not analysis).
  const first = await send("+consent1", { text: "He asked me to send 500 dollars in gift cards" });
  assert.ok(first[0].includes("AGREE"), "unconsented user must be asked to AGREE");
  assert.ok(!first.some((m) => m.includes("Veritas verdict")), "must not analyze before consent");

  // 2. AGREE grants consent.
  const agreed = await send("+consent1", { text: "AGREE" });
  assert.ok(agreed[0].toLowerCase().includes("send"), "AGREE should acknowledge and invite the chat");

  // 3. After consent, analysis proceeds normally.
  const after = await send("+consent1", { text: "He asked me to send 500 dollars in gift cards and his camera is always broken for video" });
  assert.ok(after.some((m) => m.includes("Veritas verdict")), "after consent, a rich message should get a verdict");

  // 4. DELETE bypasses the consent gate (data right).
  const del = await send("+consent2", { text: "DELETE" });
  assert.ok(del[0].toLowerCase().includes("deleted"), "DELETE must work without consent");

  console.log("consent.test passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
