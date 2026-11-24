export interface ScamAnalysisResult {
  isScam: boolean;
  score: number; // 0 to 100 risk score
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  matchedRules: string[];
  advisory: string | null;
}

interface ScamPattern {
  id: string;
  category: string;
  weight: number;
  regex: RegExp;
  warningMessage: string;
}

const SCAM_PATTERNS: ScamPattern[] = [
  // 1. Gate Pass / Visitor Pass Fee (Highest frequency Hyderabad PG scam)
  {
    id: "GATE_PASS_FEE",
    category: "Gate Pass / Entry Fee Scam",
    weight: 50,
    regex: /(?:gate\s*pass|visitor\s*pass|visiting\s*pass|entry\s*pass|pass\s*fee|pass\s*charges|security\s*entry\s*code|refundable\s*gate|gate\s*card\s*fee)/i,
    warningMessage:
      "⚠️ SCAM ALERT: Genuine PGs and owners in Hyderabad NEVER charge a 'gate pass' or 'visitor fee' to view a room. Any request for money prior to physical inspection is fraudulent."
  },

  // 2. Advance Token Deposit Before Physical Inspection
  {
    id: "ADVANCE_BEFORE_VISIT",
    category: "Advance Deposit Before Viewing",
    weight: 45,
    regex: /(?:pay\s+[^.!?]{0,40}?(?:token|advance|deposit|booking)[^.!?]{0,40}?before\s+(?:visit|seeing|check|viewing)|advance\s+(?:token|deposit|amount)\s+(?:now|urgent|today)|token\s+to\s+(?:hold|block|reserve)|send\s+(?:token|advance)\s+first)/i,
    warningMessage:
      "⚠️ CAUTION: Never pay an advance deposit or 'token amount' to hold a bed without physically stepping into the property and meeting the manager in person."
  },

  // 3. Armed Forces / Military / CISF Impersonation
  {
    id: "MILITARY_IMPERSONATION",
    category: "Armed Forces Impersonation Scam",
    weight: 50,
    regex: /(?:army\s*officer|military\s*transfer|cisf\s*officer|defense\s*quota|cantonment\s*deposit|defense\s*account|military\s*camp|army\s*id\s*card)/i,
    warningMessage:
      "⚠️ HIGH RISK: Scammers frequently impersonate transferred Army or CISF officers to establish false trust. Verify identity on-site before executing transactions."
  },

  // 4. QR Code Reverse Payment / UPI PIN Scam
  {
    id: "REVERSE_QR_UPI",
    category: "Reverse QR Code UPI Scam",
    weight: 60,
    regex: /(?:scan\s+[^.!?]{0,30}?(?:qr|barcode)[^.!?]{0,30}?to\s+(?:receive|get)|enter\s+[^.!?]{0,30}?upi\s*pin[^.!?]{0,30}?to\s+(?:receive|get|credit)|scan\s+to\s+get\s+(?:refund|deposit)|qr\s*code\s+for\s+refund)/i,
    warningMessage:
      "🚨 CRITICAL FRAUD WARNING: Scanning a QR code or entering your UPI PIN DEDUCTS money from your bank account. You NEVER need to enter a UPI PIN to receive money or refunds."
  },

  // 5. High Pressure & Artificial Urgency
  {
    id: "ARTIFICIAL_URGENCY",
    category: "Artificial Urgency Tactic",
    weight: 25,
    regex: /(?:pay\s*in\s*(?:5|10|15|30)\s*mins?|5\s*people\s*are\s*waiting|room\s*will\s*be\s*given\s*to\s*someone\s*else|immediately\s*transfer|last\s*bed\s*hurry)/i,
    warningMessage:
      "⚠️ NOTICE: High-pressure tactics forcing immediate payment without inspection are a major red flag."
  }
];

export function analyzeMessageForScam(text: string): ScamAnalysisResult {
  const normalizedText = text.trim();
  let totalScore = 0;
  const matchedRules: string[] = [];
  const advisories: string[] = [];

  for (const pattern of SCAM_PATTERNS) {
    if (pattern.regex.test(normalizedText)) {
      totalScore += pattern.weight;
      matchedRules.push(pattern.category);
      if (!advisories.includes(pattern.warningMessage)) {
        advisories.push(pattern.warningMessage);
      }
    }
  }

  const isScam = totalScore >= 40;
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (totalScore >= 50) {
    riskLevel = "HIGH";
  } else if (totalScore >= 25) {
    riskLevel = "MEDIUM";
  }

  return {
    isScam,
    score: Math.min(100, totalScore),
    riskLevel,
    matchedRules,
    advisory: advisories.length > 0 ? advisories.join(" ") : null
  };
}
