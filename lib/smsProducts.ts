export const SMS_PRODUCTS = [
  'Nisu',
  'Raps',
  'Oder',
  'Kaer',
  'Rukis',
  'Hernes',
  'Uba',
  'Mais',
  'Sojauba',
] as const

const PRODUCT_PATTERNS: Array<{ pattern: RegExp; product: (typeof SMS_PRODUCTS)[number] }> = [
  { pattern: /^(toidu|sööda)?nisu(\s+[ivx]+)?(\s*\d+\s*kat)?$/i, product: 'Nisu' },
  { pattern: /^([123]\s*kat|[123]kat)$/i, product: 'Nisu' },
  { pattern: /^(rapeseed|canola|raps)$/i, product: 'Raps' },
  { pattern: /^(sööda)?oder$/i, product: 'Oder' },
  { pattern: /^(toidu)?kaer$/i, product: 'Kaer' },
  { pattern: /^(toidu)?rukis$/i, product: 'Rukis' },
  { pattern: /^(kollane\s+)?hernes$/i, product: 'Hernes' },
  { pattern: /^(toidu|sööda)?uba$/i, product: 'Uba' },
  { pattern: /^mais$/i, product: 'Mais' },
  { pattern: /^(soja|sojauba)$/i, product: 'Sojauba' },
]

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function normalizeSmsProduct(product: string): string {
  const trimmed = normalizeWhitespace(product)
  const yearMatch = trimmed.match(/\((20\d{2})\)\s*$/)
  const yearSuffix = yearMatch ? ` (${yearMatch[1]})` : ''
  const base = yearMatch ? normalizeWhitespace(trimmed.slice(0, yearMatch.index)) : trimmed

  for (const { pattern, product: normalized } of PRODUCT_PATTERNS) {
    if (pattern.test(base)) return `${normalized}${yearSuffix}`
  }

  return `${base}${yearSuffix}`
}

export function getSmsBaseProduct(product: string): string {
  return normalizeSmsProduct(product).replace(/\s+\((20\d{2})\)\s*$/, '')
}

