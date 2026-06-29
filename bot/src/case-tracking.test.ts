import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getConfig } from "./config.js";
import { processIncomingMessage } from "./bot.js";
import { SessionStore } from "./session-store.js";
import { DataStore } from "./storage.js";
import type { CaseEvent, DetectedEntity, StoredCase } from "./types.js";

(async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "veritas-case-tracking-"));
  const config = { ...getConfig(), dataDir };
  const runtime = { config, sessions: new SessionStore(config.sessionTtlMs), data: new DataStore(config.dataDir) };

  await processIncomingMessage(runtime, {
    provider: "simulator",
    from: "+15550001111",
    timestamp: Date.now(),
    text: [
      "He says he loves me, but his camera is broken whenever I ask for a live video call.",
      "Now he wants me to send money to +1 (555) 123-4567 and check example.com/pay.",
      "He also gave me helper@example.com for the payment confirmation.",
    ].join(" "),
  });

  const cases = await readJsonl<StoredCase>(dataDir, "cases.jsonl");
  const events = await readJsonl<CaseEvent>(dataDir, "case_events.jsonl");
  const entities = await readJsonl<DetectedEntity>(dataDir, "detected_entities.jsonl");

  assert.equal(cases.length, 1, "one verdict should create one stored case");
  assert.equal(cases[0].status, "verdict_created");
  assert.equal(cases[0].scamType, "romance");
  assert.equal(cases[0].inputsSummary[0].kind, "chat_text");
  assert.ok(cases[0].modelVersion, "case should record analysis version");
  assert.ok(cases[0].promptVersion, "case should record prompt version");
  assert.equal(cases[0].verdict?.uncertainty.level, "low", "info-rich high-risk case should have low uncertainty");
  assert.equal(cases[0].verdict?.requiresHumanReview, true, "high-risk money cases should be marked for review");
  assert.ok(cases[0].verdict?.doNotDo.some((item) => /send money/i.test(item)), "verdict should include explicit prohibitions");

  assert.ok(events.some((event) => event.type === "case_started"), "case_started event should be recorded");
  assert.ok(events.some((event) => event.type === "input_received"), "input_received event should be recorded");
  assert.ok(events.some((event) => event.type === "verdict_created"), "verdict_created event should be recorded");
  assert.ok(
    events.some((event) => event.type === "verdict_created" && event.metadata.requiresHumanReview === true),
    "verdict event should expose review flag",
  );

  assert.ok(entities.some((entity) => entity.type === "phone_number"), "phone number entity should be detected");
  assert.ok(entities.some((entity) => entity.type === "url"), "URL entity should be detected");
  assert.ok(entities.some((entity) => entity.type === "email"), "email entity should be detected");
  assert.ok(!JSON.stringify(entities).includes("5551234567"), "raw phone number must not be stored");
  assert.ok(entities.every((entity) => entity.valueHash.length === 64), "entities should store sha256 hashes");

  console.log("case-tracking.test passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function readJsonl<T>(dataDir: string, fileName: string): Promise<T[]> {
  const raw = await readFile(join(dataDir, fileName), "utf8");
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}
