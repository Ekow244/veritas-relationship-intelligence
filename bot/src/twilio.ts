import type { BotMessage } from "./types.js";
import { escapeXml } from "./utils.js";

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
