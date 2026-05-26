import { ParseResult, ParsedItem, ParseError } from './types'
import { isoDateInAppZone } from './date'
import { normalizeSmsProduct } from './smsProducts'

// ── Tootekaart (pikemad võtmed enne lühemaid) ────────────────────────────────

const PRODUCTS: Record<string, string> = {
  // Nisu — variandid pikemast lühemani
  'toidunisu':     'Nisu',
  'söödanisu':     'Nisu',
  'snisu':         'Nisu',
  'nisu':          'Nisu',
  'wheat':         'Nisu',
  // Nisu kategooriad
  '1kat':          'Nisu I kat',
  '2kat':          'Nisu II kat',
  '3kat':          'Nisu III kat',
  // Raps
  'rapeseed':      'Raps',
  'canola':        'Raps',
  'raps':          'Raps',
  // Oder
  'söödaoder':     'Oder',
  'barley':        'Oder',
  'oder':          'Oder',
  // Kaer
  'toidukaer':     'Kaer',
  'oats':          'Kaer',
  'kaer':          'Kaer',
  // Rukis
  'toidurukis':    'Rukis',
  'rukis':         'Rukis',
  'rye':           'Rukis',
  // Hernes (enne lihtsat "hernes")
  'kollane hernes':'Hernes',
  'hernes':        'Hernes',
  'peas':          'Hernes',
  // Uba
  'toiduuba':      'Uba',
  'söödauba':      'Uba',
  'beans':         'Uba',
  'toad':          'Uba',
  'uba':           'Uba',
  // Mais
  'corn':          'Mais',
  'mais':          'Mais',
  // Sojauba
  'sojauba':       'Sojauba',
  'soja':          'Sojauba',
  'soy':           'Sojauba',
}

// Sorditult pikkuse järgi (pikim ees) — greedy match
const SORTED_KEYS = Object.keys(PRODUCTS).sort((a, b) => b.length - a.length)

// ── Allikad ──────────────────────────────────────────────────────────────────

const SOURCE_PATTERNS: [RegExp, string][] = [
  [/scandagra/i,          'Scandagra'],
  [/bae|baltic\s*agro/i,  'Baltic Agro'],
  [/kevili/i,             'Kevili'],
  [/viljaekspert/i,       'Viljaekspert'],
]

// ── Müra, mis tuleb eemaldada ────────────────────────────────────────────────

const NOISE_PATTERNS: RegExp[] = [
  // Loobumistekst (sisaldab telefoni — eemalda kõigepealt)
  /loobumiseks[\s\S]*/gi,
  // URL-id
  /https?:\/\/[^\s]+/gi,
  // Telefoninumbrid (ainult tühik/kriips, mitte reavahetused)
  /\+?\d[\d -]{8,}/g,
  // Kellaaeg "kuni HH:MM"
  /\b(kuni|kl\.?)\s+\d{1,2}:\d{2}\b/gi,
  // Incoterms
  /\b(dap|cpt|fob|cif|exw)\b/gi,
  // Üksikud mürasõnad
  /\bpakkumine\b/gi,
  /\b3k\b/gi,
  /\bsb\b/gi,
  // Asukohad
  /\b(muuga|sillamäe|tamsalu|keila|kunda|mäo|roodevälja|tallinn|tartu)\b/gi,
  // Ühikud
  /[€]\/t|eur\/t/gi,
]

// ── Abifunktsioonid ──────────────────────────────────────────────────────────

function todayISO(): string {
  return isoDateInAppZone()
}

function detectSource(text: string): string {
  for (const [re, name] of SOURCE_PATTERNS) {
    if (re.test(text)) return name
  }
  return 'Muu'
}

function detectDate(line: string): string | null {
  // DD.MM.YYYY
  const full = line.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/)
  if (full) {
    const [, d, m, y] = full
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // DD.MM
  const partial = line.match(/\b(\d{1,2})\.(\d{1,2})\b(?!\.\d)/)
  if (partial) {
    const [, d, m] = partial
    return `${new Date().getFullYear()}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

function stripNoise(text: string): string {
  let s = text
  for (const re of NOISE_PATTERNS) {
    s = s.replace(re, ' ')
  }
  return s
}

/**
 * "nisu210" → "nisu 210"
 * "1kat" jääb puutumata (ei rakendata digit→täht suunas,
 *  sest "1kat","2kat","3kat" on tuntud tootekirjed)
 */
function separateLettersDigits(text: string): string {
  return text.replace(/([a-zA-ZäöüõÄÖÜÕ])(\d)/g, '$1 $2')
}

// ── Positsioonil põhinev toote tuvastus ──────────────────────────────────────

interface ProductMatch {
  start: number
  end:   number
  norm:  string
}

/**
 * Leia kõik tootenimed reas koos positsiooniga.
 * Pikemad võtmed leitakse enne lühemaid (greedy).
 * Kattuvad leitud alad ignoreeritakse.
 */
function findProductsInLine(lineLower: string): ProductMatch[] {
  const found: ProductMatch[] = []

  for (const key of SORTED_KEYS) {
    let searchFrom = 0
    while (true) {
      const idx = lineLower.indexOf(key, searchFrom)
      if (idx === -1) break

      // Sõnapiiri kontroll — toode ei tohi olla teise sõna keskel
      const WORD = /[a-zA-ZäöüõÄÖÜÕ0-9]/
      const charBefore = idx > 0 ? lineLower[idx - 1] : ' '
      const charAfter  = idx + key.length < lineLower.length
        ? lineLower[idx + key.length]
        : ' '

      if (!WORD.test(charBefore) && !WORD.test(charAfter)) {
        // Kontrolli kattumist eelnevalt leituaga
        const overlaps = found.some(
          f => idx < f.end && idx + key.length > f.start
        )
        if (!overlaps) {
          found.push({ start: idx, end: idx + key.length, norm: PRODUCTS[key] })
        }
      }

      searchFrom = idx + 1
    }
  }

  return found.sort((a, b) => a.start - b.start)
}

// ── Hinna tuvastus ───────────────────────────────────────────────────────────

interface PriceMatch {
  pos:   number
  value: number
}

/**
 * Leia kõik kehtivad hinnad (50–2000) reas koos positsiooniga.
 * Filtreeritakse välja: aastaarv (2000–2099), kuupäeva osad (koos punktiga).
 */
function findPricesInLine(line: string): PriceMatch[] {
  const prices: PriceMatch[] = []
  const re = /\b(\d{2,4})\b/g
  let m: RegExpExecArray | null

  while ((m = re.exec(line)) !== null) {
    const val = parseInt(m[1], 10)
    // Jäta välja aastaarvud
    if (val >= 2000 && val <= 2099) continue
    // Kehtiv hind vahemikus
    if (val < 50 || val > 2000) continue
    // Ära loe kuupäeva osi (eelneb või järgneb punkt)
    const before = m.index > 0 ? line[m.index - 1] : ' '
    const after  = m.index + m[0].length < line.length ? line[m.index + m[0].length] : ' '
    if (before === '.' || after === '.') continue

    prices.push({ pos: m.index, value: val })
  }

  return prices
}

// ── Põhiline paarimine: toode + hind ─────────────────────────────────────────

interface InternalPair {
  norm:  string   // normaliseeritud tootenimi (nt "Nisu")
  price: number
  year:  number | null
}

/**
 * Rea sees tuvasta kõik toode+hind paarid.
 *
 * Loogika:
 *   - Otsi kõik toodete positsioonid reas
 *   - Otsi kõik kehtivad hinnad reas
 *   - Igale tootele määra lähim hind, mis asub PÄRAST toote nime
 *     ja ENNE järgmise toote algust
 *   - Lisa aasta kui leiti (suludes kujul "(2026)" või sektsiooni kontekstist)
 */
function extractPairsFromLine(
  rawLine: string,
  contextYear: number | null
): InternalPair[] {
  // 1. Puhasta müra
  const cleaned = stripNoise(rawLine)
  // 2. Lahuta kleepunud tähed+numbrid
  const line     = separateLettersDigits(cleaned)
  const lineLower = line.toLowerCase()

  const products = findProductsInLine(lineLower)
  if (products.length === 0) return []

  const prices = findPricesInLine(line)
  if (prices.length === 0) return []

  // Tuvasta saagiaasta sellel real (näit "Raps (2025)" → 2025)
  const yearInLine = (() => {
    const ym = rawLine.match(/\((\d{4})\)/)
    return ym ? parseInt(ym[1], 10) : contextYear
  })()

  const pairs: InternalPair[] = []

  for (let i = 0; i < products.length; i++) {
    const prod = products[i]
    // Toote territoorium: lõppeb järgmise toote alguses (või rea lõpus)
    const nextProdStart = i + 1 < products.length
      ? products[i + 1].start
      : Infinity

    // Hinnad, mis asuvad SELLES territooriumis
    const territory = prices.filter(
      p => p.pos >= prod.end && p.pos < nextProdStart
    )

    if (territory.length > 0) {
      // Võta esimene hind territooriumis (loomulik järjekord: toode → hind)
      pairs.push({ norm: prod.norm, price: territory[0].value, year: yearInLine })
    }
  }

  return pairs
}

// ── Duplikaatide eemaldamine ─────────────────────────────────────────────────

function deduplicatePairs(pairs: InternalPair[]): InternalPair[] {
  const seen = new Set<string>()
  return pairs.filter(p => {
    const key = `${p.norm}|${p.year ?? ''}|${p.price}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Peamine funktsioon ───────────────────────────────────────────────────────

export function parseSms(text: string): ParseResult {
  if (!text.trim()) throw new ParseError('SMS tekst on tühi')

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const source = detectSource(text)
  let date = todayISO()

  // Kuupäev — leia esimeselt sobivalt realt
  for (const line of lines) {
    const d = detectDate(line)
    if (d) { date = d; break }
  }

  let contextYear: number | null = null
  const allPairs: InternalPair[] = []

  for (const line of lines) {
    // Sektsioonipäis "2025 saak:" — uuenda kontekstaasta
    const sectionMatch = line.match(/\b(20\d{2})\s+saak\s*:/i)
    if (sectionMatch) {
      contextYear = parseInt(sectionMatch[1], 10)
      continue
    }

    const pairs = extractPairsFromLine(line, contextYear)
    allPairs.push(...pairs)
  }

  const unique = deduplicatePairs(allPairs)

  if (unique.length === 0) {
    throw new ParseError('Ühtegi hinda ei leitud SMS tekstist')
  }

  const warnings: string[] = []

  const items: ParsedItem[] = unique.map(p => {
    const product = normalizeSmsProduct(p.year ? `${p.norm} (${p.year})` : p.norm)

    if (p.price < 50 || p.price > 2000) {
      warnings.push(`Ebatavaline hind: ${product} ${p.price} €/t`)
    }

    return { product, price: p.price, unit: 'EUR/t' }
  })

  return {
    source,
    date,
    items,
    raw: text.trim(),
    ...(warnings.length > 0 && { warnings }),
  }
}
