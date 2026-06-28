import type { BotMessage, ImageRef, InputKind } from "./types.js";
import { escapeXml } from "./utils.js";
import type { BotConfig } from "./config.js";

export function parseTwilioMessage(params: URLSearchParams): BotMessage {
  const body = params.get("Body") ?? undefined;
  const from = params.get("From")?.replace(/^whatsapp:/, "") ?? "unknown";
  const numMedia = Number.parseInt(params.get("NumMedia") ?? "0", 10) || 0;

  const images: ImageRef[] = [];
  for (let i = 0; i < numMedia; i++) {
    const url = params.get(`MediaUrl${i}`);
    if (!url) continue;
    images.push({ url, mimeType: params.get(`MediaContentType${i}`) ?? undefined, caption: body });
  }

  return {
    provider: "twilio",
    from,
    id: params.get("SmsMessageSid") ?? undefined,
    timestamp: Date.now(),
    text: body,
    image: images[0],
    images: images.length ? images : undefined,
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

export async function hydrateTwilioImages(config: BotConfig, message: BotMessage): Promise<BotMessage> {
  const images = message.images ?? (message.image ? [message.image] : []);
  if (!images.length) return message;

  const { accountSid, authToken } = config.twilio;
  if (!accountSid || !authToken) return message;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const hydrated = await Promise.all(images.map(async (img) => {
    if (!img.url || img.dataUrl) return img;
    try {
      const res = await fetch(img.url, { headers: { authorization: `Basic ${auth}` } });
      if (!res.ok) return img;
      const contentType = res.headers.get("content-type") ?? img.mimeType ?? "image/jpeg";
      const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
      return { ...img, mimeType: contentType, dataUrl: `data:${contentType};base64,${base64}` };
    } catch {
      return img;
    }
  }));

  return { ...message, images: hydrated, image: hydrated[0] };
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
