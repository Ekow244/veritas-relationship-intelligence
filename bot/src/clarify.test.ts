import assert from "node:assert/strict";
import { getConfig } from "./config.js";
import { processIncomingMessage } from "./bot.js";
import { SessionStore } from "./session-store.js";
import { DataStore } from "./storage.js";
import type { BotMessage } from "./types.js";

const config = { ...getConfig(), dataDir: "/tmp/veritas-bot-clarify" };
const runtime = { config, sessions: new SessionStore(config.sessionTtlMs), data: new DataStore(config.dataDir) };

function send(from: string, fields: Partial<BotMessage>): Promise<string[]> {
  return processIncomingMessage(runtime, { provider: "simulator", from, timestamp: Date.now(), ...fields });
}

(async () => {
  // 1. Info-poor first message -> ONE verifying question (about money), not a verdict.
  const first = await send("+c1", { text: "hey, I matched with someone last week and we talk a lot" });
  assert.equal(first.length, 1, "info-poor first message should return a single question");
  assert.ok(first[0].includes("asked you for money"), "should ask the money verifying question first");

  // 2. Their answer -> verdict + an after-question (two messages).
  const second = await send("+c1", { text: "yes, he asked me to send money for a flight" });
  assert.equal(second.length, 2, "verdict turn should return verdict + follow-up");
  assert.ok(second[0].includes("Veritas verdict"), "first reply should be the verdict");
  assert.ok(second[1].includes("Anything else"), "second reply should be the follow-up question");

  // 3. Info-rich first message (money + video avoidance) -> straight to verdict, no before-question.
  const rich = await send("+c2", { text: "He asked me to send money for a flight and his camera is always broken when I want to video call" });
  assert.equal(rich.length, 2, "info-rich message should skip the before-question");
  assert.ok(rich[0].includes("Veritas verdict"), "info-rich first reply should be the verdict");
  assert.ok(!rich[0].includes("Before I give you a read"), "info-rich should not ask the before-question");

  // 4. An image counts as information-rich -> verdict, no before-question.
  const img = await send("+c3", { image: { dataUrl: "data:image/png;base64,iVBORw0KGgo=", mimeType: "image/png", caption: "is he real?" } });
  assert.equal(img.length, 2, "image message should go straight to verdict + follow-up");
  assert.ok(img[0].includes("Veritas verdict"), "image first reply should be the verdict");

  console.log("clarify.test passed");
})();
