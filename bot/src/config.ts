export type BotConfig = {
  port: number;
  host: string;
  publicBaseUrl?: string;
  sessionTtlMs: number;
  dataDir: string;
  userHashSalt: string;
  guardrails: {
    perUserDailyLimit: number;
    globalDailyCheckLimit: number;
    estimatedCostCentsPerCheck: number;
    estimatedDailyCostCentsLimit: number;
  };
  whatsapp: {
    verifyToken?: string;
    accessToken?: string;
    phoneNumberId?: string;
    appSecret?: string;
    apiVersion: string;
  };
  twilio: {
    authToken?: string;
    accountSid?: string;
    apiBase: string;
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
    guardrails: {
      perUserDailyLimit: envInt("PER_USER_DAILY_CHECK_LIMIT", 25),
      globalDailyCheckLimit: envInt("GLOBAL_DAILY_CHECK_LIMIT", 500),
      estimatedCostCentsPerCheck: envInt("ESTIMATED_COST_CENTS_PER_CHECK", 3),
      estimatedDailyCostCentsLimit: envInt("ESTIMATED_DAILY_COST_CENTS_LIMIT", 5000),
    },
    whatsapp: {
      verifyToken: env("WHATSAPP_VERIFY_TOKEN"),
      accessToken: env("WHATSAPP_ACCESS_TOKEN"),
      phoneNumberId: env("WHATSAPP_PHONE_NUMBER_ID"),
      appSecret: env("WHATSAPP_APP_SECRET"),
      apiVersion: env("WHATSAPP_API_VERSION") ?? "v23.0",
    },
    twilio: {
      authToken: env("TWILIO_AUTH_TOKEN"),
      accountSid: env("TWILIO_ACCOUNT_SID"),
      apiBase: env("TWILIO_API_BASE") ?? "https://api.twilio.com",
    },
    openai: {
      apiKey: env("OPENAI_API_KEY"),
      model: env("OPENAI_MODEL") ?? "gpt-4o-mini",
      enabled: env("ENABLE_OPENAI_ANALYSIS") === "true",
    },
  };
}
