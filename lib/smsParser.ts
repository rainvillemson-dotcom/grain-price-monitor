import { ParseResult, ParsedItem, ParseError } from './types'

const PRODUCT_ALIASES: Record<string, string> = {
  nisu: 'Nisu',
  toidunisu: 'Nisu',
  söödanisu: 'Nisu',
  wheat: 'Nisu',
  raps: 'Raps',
  rapeseed: 'Raps',
  canola: 'Raps',
  oder: 'Oder',
  barley: 'Oder',
  kaer: 'Kaer',
  oats: 'Kaer',
  rukis: 'Rukis',
  rye: 'Rukis',
  hernes: 'Hernes',
  peas: 'Hernes',
  uba: 'Uba',
  toiduuba: 'Uba',
  söödauba: 'Uba',
}

const SOURCE_PATTERNS: [RegExp, string][] = [
  [/scandagra/i, 'Scandagra'],
  [/bae|baltic\s*agro/i, 'Baltic Agro'],
  [/kevili/i, 'Kevili'],
  [/viljaekspert/i, 'Viljaekspert'],
]

// Tokens to strip before extracting prices
const STRIP_PATTERNS: RegExp[] = [
  /\b(muuga|sillamäe|tamsalu|keila|kunda|mäo|roodevälja|tallinn)\b/gi,
  /\b(3k|ii?\s*kat|1\.\s*kat|sb)\b/gi,
  /[€]\/t|eur\/t|eur\b/gi,
]

function detectSource(text: string): string {
  for (const [re, name] of SOURCE_PATTERNS) {
    if (re.test(text)) return name
  }
  return 'Muu'
}

function detectDate(text: string): string {
  // DD.MM.YYYY
  const full = text.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/)
  if (full) {
    const [, d, m, y] = full
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // DD.MM (no year)
  const partial = text.match(/\b(\d{1,2})\.(\d{1,2})\b(?!\.\d)/)
  if (partial) {
    const [, d, m] = partial
    const year = new Date().getFullYear()
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return new Date().toISOString().split('T')[0]
}

function stripNoise(text: string): string {
  let s = text
  for (const re of STRIP_PATTERNS) {
    s = s.replace(re, ' ')
  }
  return s
}

function parseProducts(text: string): ParsedItem[] {
  const cleaned = stripNoise(text)
  const keywords = Object.keys(PRODUCT_ALIASES).join('|')
  const re = new RegExp(`\\b(${keywords})\\b[\\s:]*([0-9]{2,4})`, 'gi')

  const seen = new Set<string>()
  const items: ParsedItem[] = []

  let match: RegExpExecArray | null
  while ((match = re.exec(cleaned)) !== null) {
    const key = match[1].toLowerCase()
    const product = PRODUCT_ALIASES[key]
    if (!product) continue
    const price = parseInt(match[2], 10)
    // Take only first occurrence per product
    if (seen.has(product)) continue
    seen.add(product)
    items.push({ product, price, unit: 'EUR/t' })
  }

  return items
}

export function parseSms(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) throw new ParseError('SMS tekst on tühi')

  const source = detectSource(trimmed)
  const date = detectDate(trimmed)
  const items = parseProducts(trimmed)

  if (items.length === 0) {
    throw new ParseError('Ühtegi hinda ei leitud SMS tekstist')
  }

  const warnings: string[] = []
  for (const item of items) {
    if (item.price < 50 || item.price > 2000) {
      warnings.push(`Ebatavaline hind: ${item.product} ${item.price} €/t`)
    }
  }

  return {
    source,
    date,
    items,
    raw: trimmed,
    ...(warnings.length > 0 && { warnings }),
  }
}
