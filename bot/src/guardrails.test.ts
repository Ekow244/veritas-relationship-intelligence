import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getConfig } from "./config.js";
import { processIncomingMessage } from "./bot.js";
import { GuardrailStore } from "./guardrails.js";
import { SessionStore } from "./session-store.js";
import { DataStore } from "./storage.js";

(async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "veritas-guardrails-"));
  const config = {
    ...getConfig(),
    dataDir,
    guardrails: {
      ...getConfig().guardrails,
      perUserDailyLimit: 1,
    },
  };
  const runtime = {
    config,
    sessions: new SessionStore(config.sessionTtlMs),
    data: new DataStore(config.dataDir),
    guardrails: new GuardrailStore(config.guardrails),
  };

  const first = await processIncomingMessage(runtime, {
    provider: "simulator",
    from: "+15550004444",
    timestamp: Date.now(),
    text: "He asked me to send money and says his camera is broken for video calls.",
  });
  const second = await processIncomingMessage(runtime, {
    provider: "simulator",
    from: "+15550004444",
    timestamp: Date.now(),
    text: "He also wants gift cards.",
  });

  assert.ok(!first[0].includes("safety limit"), "first check should be allowed");
  assert.ok(second[0].includes("safety limit"), "second same-user check should be rate-limited");
  assert.equal(runtime.guardrails.snapshot().globalChecks, 1, "only allowed checks should increment usage");

  console.log("guardrails.test passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
