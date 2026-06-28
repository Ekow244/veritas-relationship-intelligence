import { createServer } from "node:http";
import { URL } from "node:url";
import { getConfig } from "./config.js";
import { processIncomingMessage, processMetaMessageForWhatsApp } from "./bot.js";
import { SessionStore } from "./session-store.js";
import { DataStore } from "./storage.js";
import { hydrateTwilioImages, parseTwilioMessage, planTwilioResponse, sendTwilioWhatsApp, twimlMessage } from "./twilio.js";
import { classifyMessage } from "./classifier.js";
import { analyzingMessage } from "./formatter.js";
import { hydrateMetaImage, parseMetaWebhook, sendWhatsAppText } from "./whatsapp-cloud.js";
import {
  jsonResponse,
  readRawBody,
  safeJsonParse,
  textResponse,
  verifySha256Signature,
  verifyTwilioSignature,
} from "./utils.js";
import type { BotMessage } from "./types.js";

const config = getConfig();
const runtime = {
  config,
  sessions: new SessionStore(config.sessionTtlMs),
  data: new DataStore(config.dataDir),
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      return jsonResponse(res, 200, {
        ok: true,
        service: "veritas-whatsapp-bot",
        openaiEnabled: config.openai.enabled && Boolean(config.openai.apiKey),
      });
    }

    if (req.method === "GET" && url.pathname === "/privacy") {
      return textResponse(res, 200, privacyText());
    }

    if (req.method === "GET" && url.pathname === "/webhook") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token && token === config.whatsapp.verifyToken && challenge) {
        return textResponse(res, 200, challenge);
      }
      return textResponse(res, 403, "Verification failed");
    }

    if (req.method === "POST" && url.pathname === "/webhook") {
      const rawBody = await readRawBody(req);
      const signature = req.headers["x-hub-signature-256"];
      const signatureValue = Array.isArray(signature) ? signature[0] : signature;
      if (!verifySha256Signature(rawBody, signatureValue, config.whatsapp.appSecret)) {
        return textResponse(res, 401, "Invalid signature");
      }

      const payload = safeJsonParse(rawBody.toString("utf8"));
      const messages = payload ? parseMetaWebhook(payload) : [];
      textResponse(res, 200, "ok");

      void Promise.all(messages.map(async (message) => {
        const hydrated = await hydrateMetaImage(config, message);
        await processMetaMessageForWhatsApp(runtime, hydrated, (to, body) => sendWhatsAppText(config, to, body));
      })).catch((error) => {
        console.error(JSON.stringify({
          level: "error",
          event: "meta_webhook_processing_failed",
          message: error instanceof Error ? error.message : String(error),
        }));
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/twilio/webhook") {
      const rawBody = await readRawBody(req);
      const params = new URLSearchParams(rawBody.toString("utf8"));
      const fullUrl = `${config.publicBaseUrl ?? `http://${req.headers.host}`}${url.pathname}`;
      const signature = req.headers["x-twilio-signature"];
      const signatureValue = Array.isArray(signature) ? signature[0] : signature;
      if (!verifyTwilioSignature(params, signatureValue, fullUrl, config.twilio.authToken)) {
        return textResponse(res, 401, "Invalid signature");
      }

      const message = parseTwilioMessage(params);
      const canAsync = Boolean(config.twilio.accountSid && config.twilio.authToken);
      const plan = planTwilioResponse(params, classifyMessage(message), canAsync);

      if (plan.mode === "async") {
        textResponse(res, 200, twimlMessage(analyzingMessage()), "text/xml; charset=utf-8");
        void hydrateTwilioImages(config, message)
          .then((hydrated) => processIncomingMessage(runtime, hydrated))
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
    }

    if (req.method === "POST" && url.pathname === "/simulate") {
      const rawBody = await readRawBody(req);
      const payload = safeJsonParse<Partial<BotMessage>>(rawBody.toString("utf8"));
      if (!payload?.from) {
        return jsonResponse(res, 400, { error: "Expected JSON with at least { from, text }" });
      }

      const replies = await processIncomingMessage(runtime, {
        provider: "simulator",
        from: payload.from,
        timestamp: Date.now(),
        text: payload.text,
        image: payload.image,
      });
      return jsonResponse(res, 200, { replies });
    }

    return textResponse(res, 404, "Not found");
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      event: "request_failed",
      path: url.pathname,
      message: error instanceof Error ? error.message : String(error),
    }));
    return jsonResponse(res, 500, { error: "Internal error" });
  }
});

server.listen(config.port, config.host, () => {
  console.log(JSON.stringify({
    level: "info",
    event: "server_started",
    port: config.port,
    host: config.host,
    dataDir: config.dataDir,
    openaiEnabled: config.openai.enabled && Boolean(config.openai.apiKey),
  }));
});

function privacyText(): string {
  return [
    "Veritas WhatsApp Bot Privacy MVP",
    "",
    "Default storage: derived signals, verdict metadata, and user feedback labels. Raw chats and media are not stored by default.",
    "Session memory expires after the configured TTL. Reply DELETE to remove your active session and stored derived records matched to your number hash.",
    "Do not send identity documents, payment details, passwords, verification codes, or private account credentials.",
  ].join("\n");
}
