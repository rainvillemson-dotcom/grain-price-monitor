import { ParseResult, ParsedItem, ParseError } from './types'

const PRODUCT_ALIASES: Record<string, string> = {
  // Nisu — kõik variandid
  nisu: 'Nisu',
  toidunisu: 'Nisu',
  söödanisu: 'Nisu',
  snisu: 'Nisu',           // Scandagra lühend söödanisu
  wheat: 'Nisu',
  // Nisu kategooriad
  '1kat': 'Nisu I kat',
  '2kat': 'Nisu II kat',
  '3kat': 'Nisu III kat',
  // Raps
  raps: 'Raps',
  rapeseed: 'Raps',
  canola: 'Raps',
  // Oder
  oder: 'Oder',
  barley: 'Oder',
  // Kaer
  kaer: 'Kaer',
  oats: 'Kaer',
  // Rukis
  rukis: 'Rukis',
  rye: 'Rukis',
  // Hernes
  hernes: 'Hernes',
  peas: 'Hernes',
  // Uba
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

// Tekst mida ei tohiks tõlgendada hindadena
const STRIP_PATTERNS: RegExp[] = [
  // Loobumistekst (sisaldab telefoni — eemalda enne telefoniregexsi)
  /loobumiseks[\s\S]*/gi,
  // URL-id
  /https?:\/\/[^\s]+/gi,
  // Telefoninumbrid — kasuta [ -] mitte \s, et ei söödaks reavahetusi
  /\+?\d[\d -]{8,}/g,
  // Kellaaeg "kuni HH:MM" või "kl HH:MM"
  /\b(kuni|kl\.?)\s+\d{1,2}:\d{2}\b/gi,
  // DAP, CPT jne Incoterms
  /\b(dap|cpt|fob|cif|exw)\b/gi,
  // "pakkumine" sõna
  /\bpakkumine\b/gi,
  // Asukohad
  /\b(muuga|sillamäe|tamsalu|keila|kunda|mäo|roodevälja|tallinn)\b/gi,
  // Mõõtühikud
  /[€]\/t|eur\/t|eur\b/gi,
]

interface TextSection {
  year: number | null
  text: string
}

function detectSource(text: string): string {
  for (const [re, name] of SOURCE_PATTERNS) {
    if (re.test(text)) return name
  }
  return 'Muu'
}

function detectDate(text: string): string {
  const full = text.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/)
  if (full) {
    const [, d, m, y] = full
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
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

/** Jaga tekst "YYYY saak:" sektsioonide kaupa */
function splitSections(text: string): TextSection[] {
  const pattern = /(\d{4})\s+saak\s*:/gi
  const matches = [...text.matchAll(pattern)]

  if (matches.length === 0) {
    return [{ year: null, text }]
  }

  const sections: TextSection[] = []
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const year = parseInt(match[1], 10)
    const start = (match.index ?? 0) + match[0].length
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length
    sections.push({ year, text: text.slice(start, end) })
  }
  return sections
}

function parseProductsFromText(text: string): Array<{ key: string; price: number }> {
  const cleaned = stripNoise(text)
  const keywords = Object.keys(PRODUCT_ALIASES).join('|')
  // Regex: \b(keyword)\b võib olla tühikuid ja koolonit, siis hind
  const re = new RegExp(`\\b(${keywords})\\b[\\s:]*([0-9]{2,4})`, 'gi')

  const seen = new Set<string>()
  const results: Array<{ key: string; price: number }> = []

  let match: RegExpExecArray | null
  while ((match = re.exec(cleaned)) !== null) {
    const key = match[1].toLowerCase()
    const price = parseInt(match[2], 10)
    if (seen.has(key)) continue
    seen.add(key)
    results.push({ key, price })
  }
  return results
}

export function parseSms(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) throw new ParseError('SMS tekst on tühi')

  const source = detectSource(trimmed)
  const date = detectDate(trimmed)
  const sections = splitSections(trimmed)
  const multiSection = sections.length > 1

  const items: ParsedItem[] = []
  const warnings: string[] = []

  for (const section of sections) {
    const parsed = parseProductsFromText(section.text)

    for (const { key, price } of parsed) {
      const baseProduct = PRODUCT_ALIASES[key]
      if (!baseProduct) continue

      // Lisa saagiaasta sufiks kui mitu sektsiooni
      const product = multiSection && section.year
        ? `${baseProduct} (${section.year})`
        : baseProduct

      if (price < 50 || price > 2000) {
        warnings.push(`Ebatavaline hind: ${product} ${price} €/t`)
      }

      items.push({ product, price, unit: 'EUR/t' })
    }
  }

  // Kui sektsioonidest ei leitud midagi, proovi kogu tekstist
  if (items.length === 0) {
    const fallback = parseProductsFromText(trimmed)
    for (const { key, price } of fallback) {
      const product = PRODUCT_ALIASES[key]
      if (!product) continue
      if (price < 50 || price > 2000) warnings.push(`Ebatavaline hind: ${product} ${price} €/t`)
      items.push({ product, price, unit: 'EUR/t' })
    }
  }

  if (items.length === 0) {
    throw new ParseError('Ühtegi hinda ei leitud SMS tekstist')
  }

  return {
    source,
    date,
    items,
    raw: trimmed,
    ...(warnings.length > 0 && { warnings }),
  }
}
