export type RiskLevel = "low" | "medium" | "high";

export type InputKind =
  | "greeting"
  | "chat_text"
  | "image"
  | "question"
  | "report_back"
  | "delete_request"
  | "scope_violation"
  | "crisis"
  | "out_of_scope"
  | "unknown";

export type BotMessage = {
  provider: "meta" | "twilio" | "simulator";
  from: string;
  id?: string;
  timestamp: number;
  text?: string;
  image?: {
    id?: string;
    url?: string;
    mimeType?: string;
    caption?: string;
    dataUrl?: string;
  };
};

export type SessionInput = {
  kind: InputKind;
  text?: string;
  image?: BotMessage["image"];
  receivedAt: number;
};

export type Session = {
  userRef: string;
  startedAt: number;
  updatedAt: number;
  greeted: boolean;
  clarifierAsked?: boolean;
  inputs: SessionInput[];
  lastVerdict?: Verdict;
};

export type Signal = {
  type: string;
  label: string;
  evidence: string;
  confidence: number;
  weight: number;
  source: "heuristic" | "llm" | "image_api" | "user_report";
};

export type Verdict = {
  caseId: string;
  riskLevel: RiskLevel;
  score: number;
  signals: Signal[];
  balancingSignals: string[];
  explanation: string;
  nextSteps: string[];
  disclaimer: string;
  createdAt: string;
};

export type StoredCase = {
  id: string;
  createdAt: string;
  channel: "whatsapp" | "simulator";
  userRef: string;
  inputsSummary: string[];
  status: "verdict_created" | "partial" | "deleted";
  ttlExpiresAt: string;
  verdict?: Omit<Verdict, "caseId">;
};

export type StoredReport = {
  id: string;
  caseId?: string;
  userRef: string;
  reportedOutcome: "scam" | "safe" | "unsure";
  scamIndicators: string[];
  consentedToIntel: boolean;
  createdAt: string;
};
