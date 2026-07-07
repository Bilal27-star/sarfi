/**
 * Provider-agnostic natural-language expense parsing.
 *
 * The interface is what matters: any provider (a local rule engine today,
 * an LLM later) receives raw text and returns structured expense candidates.
 * No paid vendor is wired in — `LocalRuleParser` is a deterministic,
 * honest baseline that handles common Algerian Darija/French/English patterns.
 */

export type ExpenseCandidate = {
  description: string
  amount: string // canonical decimal string
  currency: string
  categorySlug?: string
  confidence: number // 0..1
}

export interface ExpenseParser {
  readonly name: string
  parse(text: string): Promise<ExpenseCandidate[]>
}

/** keyword -> category slug (both Arabic and Latin variants) */
const KEYWORD_CATEGORIES: [RegExp, string, string][] = [
  [/بيتزا|pizza/i, 'food-pizza', 'Pizza'],
  [/قهوة|كافي|café|coffee|qahwa/i, 'food-coffee', 'Coffee'],
  [/بنزين|مازوت|essence|fuel|carburant/i, 'moto-fuel', 'Fuel'],
  [/زيت المحرك|زيت|huile|oil/i, 'moto-oil', 'Engine oil'],
  [/دجاج|poulet|chicken/i, 'meat-chicken', 'Chicken'],
  [/لحم|viande|beef/i, 'meat-beef', 'Beef'],
  [/حوت|سمك|poisson|fish/i, 'meat-fish', 'Fish'],
  [/خضر|خضرة|légumes|vegetables/i, 'groceries-vegetables', 'Vegetables'],
  [/فواكه|فاكية|fruits?/i, 'groceries-fruits', 'Fruits'],
  [/تاكسي|taxi/i, 'transport', 'Taxi'],
  [/باص|bus/i, 'transport', 'Bus'],
  [/دواء|صيدلية|pharmacie|pharmacy/i, 'health', 'Pharmacy'],
  [/انترنت|إنترنت|internet/i, 'subscriptions', 'Internet'],
]

const AMOUNT_RE = /(\d+(?:[.,]\d{1,2})?)\s*(?:دج|دا|da|dzd|دينار)?/gi

/**
 * Splits text on common conjunctions (و / et / and / ,) and extracts an
 * amount + best-guess category per segment. "شريت دجاج 800 وخضر 700"
 * yields two candidates.
 */
export class LocalRuleParser implements ExpenseParser {
  readonly name = 'local-rules'

  async parse(text: string): Promise<ExpenseCandidate[]> {
    const segments = text
      .split(/\s+و(?=\S)|\bو\b|\bet\b|\band\b|,|;/i)
      .map((s) => s.trim())
      .filter(Boolean)

    const candidates: ExpenseCandidate[] = []
    for (const segment of segments) {
      AMOUNT_RE.lastIndex = 0
      const amounts = [...segment.matchAll(AMOUNT_RE)].map((m) => m[1].replace(',', '.'))
      if (amounts.length === 0) continue
      const match = KEYWORD_CATEGORIES.find(([re]) => re.test(segment))
      candidates.push({
        description: match ? match[2] : segment.replace(AMOUNT_RE, '').trim() || 'Expense',
        amount: Number(amounts[0]).toFixed(2),
        currency: 'DZD',
        categorySlug: match?.[1],
        confidence: match ? 0.8 : 0.4,
      })
    }
    return candidates
  }
}

export function getExpenseParser(): ExpenseParser {
  // Future: switch on env/config to an LLM-backed provider implementing ExpenseParser.
  return new LocalRuleParser()
}
