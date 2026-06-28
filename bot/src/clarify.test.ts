import assert from "node:assert/strict";
import { getConfig } from "./config.js";
import { processIncomingMessage } from "./bot.js";
import { SessionStore } from "./session-store.js";
import { DataStore } from "./storage.js";
import { hashUser } from "./utils.js";
import type { BotMessage } from "./types.js";

const config = { ...getConfig(), dataDir: "/tmp/veritas-bot-clarify" };
const runtime = { config, sessions: new SessionStore(config.sessionTtlMs), data: new DataStore(config.dataDir) };

function send(from: string, fields: Partial<BotMessage>): Promise<string[]> {
  return processIncomingMessage(runtime, { provider: "simulator", from, timestamp: Date.now(), ...fields });
}

function userRefFor(from: string): string {
  return hashUser(from, config.userHashSalt);
}

(async () => {
  // 1. Info-poor first message -> ONE verifying question (about money), not a verdict.
  const first = await send("+c1", { text: "hey, I matched with someone last week and we talk a lot" });
  assert.equal(first.length, 1, "info-poor first message should return a single question");
  assert.ok(first[0].includes("asked you for money"), "should ask the money verifying question first");

  // 2. Their answer -> verdict, then the follow-up question is always the LAST message.
  const second = await send("+c1", { text: "yes, he asked me to send money for a flight" });
  assert.ok(second[0].includes("Veritas verdict"), "first reply should be the verdict");
  assert.ok(second[second.length - 1].includes("Anything else"), "follow-up question should be the last reply");

  // 3. Info-rich first message (money + video avoidance) -> straight to verdict, no before-question.
  const rich = await send("+c2", { text: "He asked me to send money for a flight and his camera is always broken when I want to video call" });
  assert.ok(rich[0].includes("Veritas verdict"), "info-rich first reply should be the verdict");
  assert.ok(!rich[0].includes("Before I give you a read"), "info-rich should not ask the before-question");

  // 4. An image counts as information-rich -> verdict, then follow-up last.
  const img = await send("+c3", { image: { dataUrl: "data:image/png;base64,iVBORw0KGgo=", mimeType: "image/png", caption: "is he real?" } });
  assert.ok(img[0].includes("Veritas verdict"), "image first reply should be the verdict");
  assert.ok(img[img.length - 1].includes("Anything else"), "image verdict should end with the follow-up");

  // 5. Case isolation — case B must not inherit case A (regression for the "both individuals" bug).
  await send("+iso", { text: "David is an oil rig engineer and asked me for 800 dollars in iTunes gift cards" });
  await send("+iso", { text: "yes" }); // answer the screening question -> verdict for case A
  await send("+iso", { text: "Marcus is a military surgeon in Syria who needs 1275 dollars in Steam gift cards" });
  const sess = runtime.sessions.get(userRefFor("+iso"));
  const caseText = sess.inputs.filter((i) => i.text).map((i) => i.text).join(" ");
  assert.ok(caseText.includes("Marcus"), "current case should contain the new submission");
  assert.ok(!caseText.includes("David"), "current case must NOT contain the prior unrelated case");

  // 6. MEDIUM/HIGH verdict is followed by concrete action steps; LOW is not.
  const hi = await send("+act", { text: "He asked me to send 800 dollars in iTunes gift cards and his camera is always broken for video calls" });
  assert.ok(hi.some((m) => m.includes("reportfraud.ftc.gov")), "high-risk verdict should include action steps");
  await send("+benign", { text: "We mostly talk about books and our jobs and what we cooked for dinner this week" });
  const lo2 = await send("+benign", { text: "no" });
  assert.ok(!lo2.some((m) => m.includes("reportfraud.ftc.gov")), "low-risk verdict must not include action steps");

  console.log("clarify.test passed");
})();
