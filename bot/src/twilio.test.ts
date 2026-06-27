import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { hydrateTwilioImage, planTwilioResponse, sendTwilioWhatsApp } from "./twilio.js";
import type { BotConfig } from "./config.js";
import type { BotMessage } from "./types.js";

function paramsFrom(obj: Record<string, string>): URLSearchParams {
  return new URLSearchParams(obj);
}

(async () => {
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
  const noCredsConfig = { twilio: { apiBase: "http://127.0.0.1:1", accountSid: undefined, authToken: undefined } } as unknown as BotConfig;
  await sendTwilioWhatsApp(noCredsConfig, "whatsapp:+1", "whatsapp:+2", "hi"); // must not throw

  // --- sendTwilioWhatsApp: constructs the right request ---
  let stubHits = 0;
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

  // --- hydrateTwilioImage: downloads media with Basic auth and sets dataUrl ---
  let mediaAuth: string | undefined;
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const mediaStub = createServer((req, res) => {
    mediaAuth = req.headers.authorization;
    res.writeHead(200, { "content-type": "image/png" });
    res.end(pngBytes);
  });
  await new Promise<void>((resolve) => mediaStub.listen(0, "127.0.0.1", () => resolve()));
  const mediaPort = (mediaStub.address() as AddressInfo).port;
  const mediaConfig = { twilio: { accountSid: "ACtest", authToken: "tok", apiBase: "http://unused" } } as unknown as BotConfig;

  const hydrated = await hydrateTwilioImage(mediaConfig, {
    provider: "twilio", from: "whatsapp:+1", timestamp: 0,
    image: { url: `http://127.0.0.1:${mediaPort}/media/abc`, mimeType: "image/jpeg" },
  });
  mediaStub.close();
  assert.equal(mediaAuth, `Basic ${Buffer.from("ACtest:tok").toString("base64")}`);
  assert.equal(hydrated.image?.mimeType, "image/png");
  assert.equal(hydrated.image?.dataUrl, `data:image/png;base64,${pngBytes.toString("base64")}`);

  // no-op: no image url returns the same object unchanged
  const noUrl = { provider: "twilio", from: "x", timestamp: 0, text: "hi" } as BotMessage;
  assert.equal(await hydrateTwilioImage(mediaConfig, noUrl), noUrl);

  // no-op: missing creds returns the same object unchanged (no fetch)
  const noCredsImg = { provider: "twilio", from: "x", timestamp: 0, image: { url: "http://127.0.0.1:1/x" } } as BotMessage;
  const noCredsCfg = { twilio: { accountSid: undefined, authToken: undefined, apiBase: "x" } } as unknown as BotConfig;
  assert.equal(await hydrateTwilioImage(noCredsCfg, noCredsImg), noCredsImg);

  // no-op: already hydrated is left untouched
  const already = { provider: "twilio", from: "x", timestamp: 0, image: { url: "http://x", dataUrl: "data:image/png;base64,AAAA" } } as BotMessage;
  assert.equal((await hydrateTwilioImage(mediaConfig, already)).image?.dataUrl, "data:image/png;base64,AAAA");

  console.log("twilio.test passed");
})();
