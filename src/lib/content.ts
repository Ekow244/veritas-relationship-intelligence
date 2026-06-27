import {
  BadgeCheck,
  ClipboardCheck,
  FileCheck2,
  Fingerprint,
  HeartHandshake,
  Landmark,
  LockKeyhole,
  MessageCircleWarning,
  Scale,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type IconContent = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type PricingTier = {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};

export type FAQItem = {
  question: string;
  answer: string;
};

export const navigation = [
  { label: "Services", href: "#services" },
  { label: "Process", href: "#process" },
  { label: "Ethics", href: "#ethics" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export const trustBadges = [
  "Ethical OSINT only",
  "Confidential intake",
  "Private evidence report",
  "No hacking. No stalking.",
];

export const services: IconContent[] = [
  {
    title: "Identity Verification",
    description:
      "Confirm whether someone's name, photos, profiles, and public footprint are consistent with the story they are telling.",
    icon: Fingerprint,
  },
  {
    title: "Catfish & Romance Scam Review",
    description:
      "Analyze suspicious online relationships, stolen photos, fake accounts, romance scam patterns, and emotional manipulation signals.",
    icon: MessageCircleWarning,
  },
  {
    title: "Digital Footprint Research",
    description:
      "Review publicly available records, social media activity, aliases, timelines, and inconsistencies using ethical OSINT methods.",
    icon: BadgeCheck,
  },
  {
    title: "Long-Distance Relationship Verification",
    description:
      "For clients who need confidence before investing emotionally, financially, or traveling to meet someone.",
    icon: HeartHandshake,
  },
  {
    title: "Dating Background Check",
    description:
      "Review publicly available indicators around identity, relationship status, criminal/court records where legally accessible, and major inconsistencies.",
    icon: UserCheck,
  },
  {
    title: "Confidential Evidence Report",
    description:
      "Receive a clear private report with findings, source links, screenshots where appropriate, confidence levels, and recommended next steps.",
    icon: FileCheck2,
  },
];

export const processSteps: IconContent[] = [
  {
    title: "Submit a confidential intake",
    description:
      "Client shares the situation, concerns, known names, social handles, phone numbers, photos, timelines, and any relevant public links.",
    icon: LockKeyhole,
  },
  {
    title: "Ethical investigation begins",
    description:
      "The team reviews only public-source and client-provided information. No hacking, tracking, impersonation, or illegal surveillance.",
    icon: ShieldCheck,
  },
  {
    title: "Receive your clarity report",
    description:
      "Client receives a private PDF report summarizing findings, evidence, uncertainty, risk indicators, and recommended next steps.",
    icon: ClipboardCheck,
  },
];

export const pricingTiers: PricingTier[] = [
  {
    name: "Essential Check",
    price: "$149",
    description: "For early doubts, online dating verification, or catfish concerns.",
    features: [
      "Identity consistency review",
      "Reverse image checks",
      "Basic social footprint review",
      "Summary report",
      "48-72 hour delivery",
    ],
  },
  {
    name: "Deep Clarity",
    price: "$399",
    description:
      "For serious relationships, long-distance concerns, or repeated inconsistencies.",
    highlighted: true,
    features: [
      "Expanded OSINT review",
      "Alias/profile research",
      "Timeline inconsistency analysis",
      "Public record review where available",
      "Detailed PDF report",
      "Recommended next steps",
    ],
  },
  {
    name: "Concierge Review",
    price: "$899+",
    description:
      "For sensitive, complex, or high-stakes relationship decisions.",
    features: [
      "Private intake call",
      "Custom investigation scope",
      "Senior analyst review",
      "Evidence packet",
      "Optional debrief call",
    ],
  },
];

export const faqs: FAQItem[] = [
  {
    question: "Is this legal?",
    answer:
      "We only use lawful, public-source information and information provided by the client. We do not hack, stalk, impersonate, or access private accounts.",
  },
  {
    question: "Can you prove someone is cheating?",
    answer:
      "We do not promise conclusions we cannot prove. We identify verified facts, inconsistencies, and risk indicators based on available evidence.",
  },
  {
    question: "Do you hack phones or social media accounts?",
    answer:
      "No. We never hack accounts, access private messages, install spyware, or bypass privacy controls.",
  },
  {
    question: "Is this confidential?",
    answer:
      "Yes. Confidentiality is central to the service. Intake details and reports are handled privately.",
  },
  {
    question: "What do I receive?",
    answer:
      "A private clarity report with findings, evidence, confidence levels, limitations, and next-step recommendations.",
  },
  {
    question: "Who is this for?",
    answer:
      "People in online dating, long-distance relationships, pre-marriage situations, post-betrayal confusion, or situations where something does not feel consistent.",
  },
];

export const ethicsCards: IconContent[] = [
  {
    title: "Lawful sources",
    description:
      "Research is limited to public-source information and materials the client is authorized to provide.",
    icon: Scale,
  },
  {
    title: "Private by design",
    description:
      "Sensitive details are handled with a need-to-know posture from intake through report delivery.",
    icon: LockKeyhole,
  },
  {
    title: "Evidence over certainty theater",
    description:
      "Reports distinguish verified facts, confidence levels, limitations, and unanswered questions.",
    icon: Landmark,
  },
];

// WhatsApp click-to-chat. Twilio sandbox: prefillText is the join phrase so new
// testers auto-join when they hit send. To go production: set `number` to your
// production WhatsApp number and change `prefillText` to a greeting like
// "Hi, I'd like to check someone".
export const whatsapp = {
  number: "14155238886",
  prefillText: "join behind-across",
};

export function whatsappHref(): string {
  return `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(whatsapp.prefillText)}`;
}
