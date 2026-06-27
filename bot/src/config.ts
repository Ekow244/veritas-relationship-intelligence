export type BotConfig = {
  port: number;
  host: string;
  publicBaseUrl?: string;
  sessionTtlMs: number;
  dataDir: string;
  userHashSalt: string;
  whatsapp: {
    verifyToken?: string;
    accessToken?: string;
    phoneNumberId?: string;
    appSecret?: string;
    apiVersion: string;
  };
  twilio: {
    authToken?: string;
  };
  openai: {
    apiKey?: string;
    model: string;
    enabled: boolean;
  };
};

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function envInt(name: string, fallback: number): number {
  const raw = env(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getConfig(): BotConfig {
  const ttlMinutes = envInt("SESSION_TTL_MINUTES", 30);

  return {
    port: envInt("PORT", 8787),
    host: env("HOST") ?? "0.0.0.0",
    publicBaseUrl: env("PUBLIC_BASE_URL"),
    sessionTtlMs: ttlMinutes * 60 * 1000,
    dataDir: env("DATA_DIR") ?? "./bot/data",
    userHashSalt: env("USER_HASH_SALT") ?? "dev-only-change-me",
    whatsapp: {
      verifyToken: env("WHATSAPP_VERIFY_TOKEN"),
      accessToken: env("WHATSAPP_ACCESS_TOKEN"),
      phoneNumberId: env("WHATSAPP_PHONE_NUMBER_ID"),
      appSecret: env("WHATSAPP_APP_SECRET"),
      apiVersion: env("WHATSAPP_API_VERSION") ?? "v23.0",
    },
    twilio: {
      authToken: env("TWILIO_AUTH_TOKEN"),
    },
    openai: {
      apiKey: env("OPENAI_API_KEY"),
      model: env("OPENAI_MODEL") ?? "gpt-4o-mini",
      enabled: env("ENABLE_OPENAI_ANALYSIS") === "true",
    },
  };
}
