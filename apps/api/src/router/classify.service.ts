import { Injectable } from '@nestjs/common';

export interface SensitivityResult {
  sensitive: boolean;
  /** Category names only — the matched text itself is deliberately NOT echoed back. */
  categories: string[];
}

export interface ComplexityResult {
  /** 0–1. */
  score: number;
  signals: string[];
}

/**
 * Heuristic classification, on purpose.
 *
 * The obvious alternative — asking an LLM to classify the prompt before
 * routing it — costs a model call to decide whether to spend a model call,
 * and for the sensitivity check it means sending possibly-sensitive text to
 * the very place the check exists to keep it away from. Regex + heuristics
 * run in microseconds, are auditable line by line, and fail in predictable
 * ways. The trade-off is recall: a heuristic misses PII a model might catch.
 * That is why sensitivity only ever forces traffic LOCAL — a false negative
 * routes one prompt to a cloud model, a false positive merely costs some
 * latency. The failure directions are asymmetric and the design leans on
 * the safe side of that asymmetry.
 */
@Injectable()
export class ClassifyService {
  private static readonly PII_PATTERNS: { category: string; re: RegExp }[] = [
    { category: 'email address', re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/ },
    // 10+ digits with optional separators, starting with + or a digit —
    // deliberately loose; see the asymmetry note above.
    { category: 'phone number', re: /(?:\+|\b)\d[\d\s().-]{8,}\d\b/ },
    { category: 'card-like number', re: /\b(?:\d[ -]?){13,19}\b/ },
    {
      category: 'IBAN-like identifier',
      re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/,
    },
    {
      category: 'credential keyword',
      re: /\b(password|passphrase|api[_ ]?key|secret[_ ]?key|access[_ ]?token|private[_ ]?key)\b/i,
    },
    {
      category: 'sensitivity keyword',
      re: /\b(confidential|proprietary|do not share|internal only|nda|classified)\b/i,
    },
    {
      category: 'government identifier keyword',
      re: /\b(ssn|social security|aadhaar|passport number|emirates id|national id)\b/i,
    },
  ];

  sensitivity(prompt: string): SensitivityResult {
    const categories = ClassifyService.PII_PATTERNS.filter(({ re }) =>
      re.test(prompt),
    ).map(({ category }) => category);
    return { sensitive: categories.length > 0, categories };
  }

  complexity(prompt: string): ComplexityResult {
    const signals: string[] = [];
    let score = 0.15; // floor: every prompt costs something to answer well

    const words = prompt.trim().split(/\s+/).length;
    if (words > 150) {
      score += 0.25;
      signals.push(`long prompt (${words} words)`);
    } else if (words > 60) {
      score += 0.12;
      signals.push(`medium-length prompt (${words} words)`);
    }

    if (/```|\bfunction\b|\bclass\b|=>|\bSELECT\b.*\bFROM\b/i.test(prompt)) {
      score += 0.2;
      signals.push('contains code');
    }

    if (
      /\b(prove|derive|step[- ]by[- ]step|architect|design a|trade-?offs?|compare and contrast|optimi[sz]e|refactor|debug|root cause)\b/i.test(
        prompt,
      )
    ) {
      score += 0.25;
      signals.push('reasoning/analysis language');
    }

    if (/\b(why|how)\b/i.test(prompt)) {
      score += 0.1;
      signals.push('analytical question form');
    }

    const questionMarks = (prompt.match(/\?/g) ?? []).length;
    if (questionMarks > 1) {
      score += 0.1;
      signals.push(`multiple questions (${questionMarks})`);
    }

    if (signals.length === 0) signals.push('short, simple prompt');
    return { score: Math.min(1, Number(score.toFixed(3))), signals };
  }
}
