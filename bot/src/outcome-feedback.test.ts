import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getConfig } from "./config.js";
import { processIncomingMessage } from "./bot.js";
import { SessionStore } from "./session-store.js";
import { DataStore } from "./storage.js";
import type { CaseEvent, StoredReport } from "./types.js";

(async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "veritas-outcome-feedback-"));
  const config = { ...getConfig(), dataDir };
  const runtime = { config, sessions: new SessionStore(config.sessionTtlMs), data: new DataStore(config.dataDir) };

  await processIncomingMessage(runtime, {
    provider: "simulator",
    from: "+15550003333",
    timestamp: Date.now(),
    text: "He says he loves me, needs me to send money today, and his camera is broken when I ask for a video call.",
  });

  const thanks = await processIncomingMessage(runtime, {
    provider: "simulator",
    from: "+15550003333",
    timestamp: Date.now(),
    text: "SCAM - I blocked him and did not send money",
  });

  const reports = await readJsonl<StoredReport>(dataDir, "reports.jsonl");
  const events = await readJsonl<CaseEvent>(dataDir, "case_events.jsonl");

  assert.equal(reports.length, 1, "report reply should create one report");
  assert.equal(reports[0].reportedOutcome, "scam");
  assert.equal(reports[0].userAction, "blocked");
  assert.equal(reports[0].avertedHarm, true);
  assert.ok(thanks[0].includes("averted harm"), "thank-you should mention likely averted harm");
  assert.ok(
    events.some((event) => event.type === "report_received" && event.metadata.avertedHarm === true),
    "report event should expose averted-harm metadata",
  );

  console.log("outcome-feedback.test passed");
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
