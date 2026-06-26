import type { BotConfig } from "./config.js";
import type { BotMessage } from "./types.js";
import { truncate } from "./utils.js";

type MetaWebhook = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: {
          phone_number_id?: string;
        };
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          image?: {
            id?: string;
            mime_type?: string;
            caption?: string;
          };
        }>;
      };
    }>;
  }>;
};

export function parseMetaWebhook(payload: MetaWebhook): BotMessage[] {
  const messages: BotMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const raw of change.value?.messages ?? []) {
        if (!raw.from) continue;
        messages.push({
          provider: "meta",
          from: raw.from,
          id: raw.id,
          timestamp: raw.timestamp ? Number(raw.timestamp) * 1000 : Date.now(),
          text: raw.text?.body,
          image: raw.image
            ? {
                id: raw.image.id,
                mimeType: raw.image.mime_type,
                caption: raw.image.caption,
              }
            : undefined,
        });
      }
    }
  }
  return messages;
}

export async function sendWhatsAppText(config: BotConfig, to: string, body: string): Promise<void> {
  const { accessToken, phoneNumberId, apiVersion } = config.whatsapp;
  if (!accessToken || !phoneNumberId) {
    console.log(JSON.stringify({
      level: "warn",
      event: "whatsapp_send_skipped",
      reason: "missing_credentials",
      to,
      body: truncate(body, 160),
    }));
    return;
  }

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        preview_url: false,
        body,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp send failed: ${response.status} ${errorText.slice(0, 500)}`);
  }
}

export async function hydrateMetaImage(config: BotConfig, message: BotMessage): Promise<BotMessage> {
  if (!message.image?.id || message.image.dataUrl || !config.whatsapp.accessToken) return message;

  const metadataResponse = await fetch(`https://graph.facebook.com/${config.whatsapp.apiVersion}/${message.image.id}`, {
    headers: {
      authorization: `Bearer ${config.whatsapp.accessToken}`,
    },
  });

  if (!metadataResponse.ok) return message;

  const metadata = await metadataResponse.json() as { url?: string; mime_type?: string };
  if (!metadata.url) return message;

  const mediaResponse = await fetch(metadata.url, {
    headers: {
      authorization: `Bearer ${config.whatsapp.accessToken}`,
    },
  });

  if (!mediaResponse.ok) return message;

  const contentType = mediaResponse.headers.get("content-type") ?? metadata.mime_type ?? message.image.mimeType ?? "image/jpeg";
  const bytes = Buffer.from(await mediaResponse.arrayBuffer());
  const base64 = bytes.toString("base64");

  return {
    ...message,
    image: {
      ...message.image,
      mimeType: contentType,
      dataUrl: `data:${contentType};base64,${base64}`,
    },
  };
}
