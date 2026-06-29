import { getConfig } from "./config.js";
import { processIncomingMessage } from "./bot.js";
import { SessionStore } from "./session-store.js";
import { DataStore } from "./storage.js";

const config = {
  ...getConfig(),
  dataDir: "/tmp/veritas-bot-smoke",
};

const runtime = {
  config,
  sessions: new SessionStore(config.sessionTtlMs),
  data: new DataStore(config.dataDir),
};

async function main(): Promise<void> {
  const replies = await processIncomingMessage(runtime, {
    provider: "simulator",
    from: "+15551234567",
    timestamp: Date.now(),
    text: "He said he loves me after two days and needs me to send money for a hospital emergency. He also says his camera is broken when I ask for a video call.",
  });

  const output = replies.join("\n\n");
  if (!output.includes("HIGH") || !/money/i.test(output)) {
    console.error(output);
    throw new Error("Expected high-risk money-request verdict");
  }

  console.log("Smoke test passed");
  console.log(output);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
