export type RiskLevel = "low" | "medium" | "high";

export type ScamType =
  | "romance"
  | "rental"
  | "investment"
  | "sextortion"
  | "impersonation"
  | "unknown";

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

export type ImageRef = {
  id?: string;
  url?: string;
  mimeType?: string;
  caption?: string;
  dataUrl?: string;
};

export type BotMessage = {
  provider: "meta" | "twilio" | "simulator";
  from: string;
  id?: string;
  timestamp: number;
  text?: string;
  image?: ImageRef;
  images?: ImageRef[];
};

export type SessionInput = {
  kind: InputKind;
  text?: string;
  image?: ImageRef;
  images?: ImageRef[];
  receivedAt: number;
};

export type CaseInputSummary = {
  kind: InputKind;
  receivedAt: string;
  textLength: number;
  imageCount: number;
};

export type Session = {
  userRef: string;
  startedAt: number;
  updatedAt: number;
  greeted: boolean;
  clarifierAsked?: boolean;
  stage?: "awaiting_screening" | "verdict_done";
  inputs: SessionInput[];
  lastVerdict?: Verdict;
};

export type Signal = {
  type: string;
  label: string;
  evidence: string;
  confidence: number;
  weight: number;
  source: "heuristic" | "llm" | "image_api" | "user_report" | "intel";
};

export type IntelMatch = {
  entityType: DetectedEntityType;
  valueHash: string;
  valuePreview: string;
  matchCount: number;
  previousCaseIds: string[];
  confidence: number;
};

export type Verdict = {
  caseId: string;
  riskLevel: RiskLevel;
  score: number;
  signals: Signal[];
  balancingSignals: string[];
  counterSignals: string[];
  uncertainty: {
    level: RiskLevel;
    reasons: string[];
  };
  explanation: string;
  nextSteps: string[];
  doNotDo: string[];
  requiresHumanReview: boolean;
  disclaimer: string;
  createdAt: string;
};

export type StoredCase = {
  id: string;
  createdAt: string;
  channel: "whatsapp" | "simulator";
  userRef: string;
  scamType: ScamType;
  inputsSummary: CaseInputSummary[];
  status: "created" | "verdict_created" | "partial" | "deleted";
  ttlExpiresAt: string;
  modelVersion?: string;
  promptVersion?: string;
  verdict?: Omit<Verdict, "caseId">;
};

export type CaseEventType =
  | "case_started"
  | "input_received"
  | "verdict_created"
  | "report_received"
  | "delete_requested";

export type CaseEvent = {
  id: string;
  caseId?: string;
  userRef: string;
  type: CaseEventType;
  createdAt: string;
  metadata: Record<string, string | number | boolean | string[] | undefined>;
};

export type DetectedEntityType =
  | "phone_number"
  | "url"
  | "email"
  | "payment_handle"
  | "crypto_wallet"
  | "image_reference";

export type DetectedEntity = {
  id: string;
  caseId: string;
  userRef: string;
  type: DetectedEntityType;
  valueHash: string;
  valuePreview: string;
  source: "regex" | "image_metadata";
  confidence: number;
  createdAt: string;
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
