import type { BotMessage, InputKind } from "./types.js";
import { escapeXml } from "./utils.js";
import type { BotConfig } from "./config.js";

export function parseTwilioMessage(params: URLSearchParams): BotMessage {
  const mediaUrl = params.get("MediaUrl0") ?? undefined;
  const mediaType = params.get("MediaContentType0") ?? undefined;
  const body = params.get("Body") ?? undefined;
  const from = params.get("From")?.replace(/^whatsapp:/, "") ?? "unknown";

  return {
    provider: "twilio",
    from,
    id: params.get("SmsMessageSid") ?? undefined,
    timestamp: Date.now(),
    text: body,
    image: mediaUrl
      ? {
          url: mediaUrl,
          mimeType: mediaType,
          caption: body,
        }
      : undefined,
  };
}

export function twimlMessage(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(body)}</Message></Response>`;
}

export type TwilioPlan =
  | { mode: "sync" }
  | { mode: "async"; channelTo: string; channelFrom: string };

export function planTwilioResponse(
  params: URLSearchParams,
  kind: InputKind,
  canAsync: boolean,
): TwilioPlan {
  const isAnalyze = kind === "chat_text" || kind === "image";
  if (isAnalyze && canAsync) {
    return {
      mode: "async",
      channelTo: params.get("From") ?? "",
      channelFrom: params.get("To") ?? "",
    };
  }
  return { mode: "sync" };
}

export async function sendTwilioWhatsApp(
  config: BotConfig,
  toRaw: string,
  fromRaw: string,
  body: string,
): Promise<void> {
  const { accountSid, authToken, apiBase } = config.twilio;
  if (!accountSid || !authToken) {
    console.log(JSON.stringify({
      level: "warn",
      event: "twilio_send_skipped",
      reason: "missing_credentials",
      to: toRaw,
    }));
    return;
  }

  const url = `${apiBase}/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const form = new URLSearchParams({ From: fromRaw, To: toRaw, Body: body });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio send failed: ${response.status} ${errorText.slice(0, 500)}`);
  }
}
