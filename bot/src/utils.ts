import { createHash, createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function hashUser(value: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function safeJsonParse<T>(raw: string): T | undefined {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function jsonResponse(
  res: import("node:http").ServerResponse,
  status: number,
  payload: unknown,
): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

export function textResponse(
  res: import("node:http").ServerResponse,
  status: number,
  body: string,
  contentType = "text/plain; charset=utf-8",
): void {
  res.writeHead(status, {
    "content-type": contentType,
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

export function verifySha256Signature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string | undefined,
): boolean {
  if (!secret) return true;
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = Buffer.from(
    `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`,
  );
  const actual = Buffer.from(signatureHeader);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function verifyTwilioSignature(params: URLSearchParams, signature: string | undefined, url: string, authToken?: string): boolean {
  if (!authToken) return true;
  if (!signature) return false;

  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const payload = sorted.reduce((acc, [key, value]) => `${acc}${key}${value}`, url);
  const expected = createHmac("sha1", authToken).update(payload).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function truncate(value: string, max = 320): string {
  const singleLine = value.replace(/\s+/g, " ").trim();
  return singleLine.length <= max ? singleLine : `${singleLine.slice(0, max - 1)}…`;
}
