const { loadEnvConfig } = require('@next/env')
const { PrismaClient } = require('@prisma/client')

loadEnvConfig(process.cwd())

const prisma = new PrismaClient({ log: ['error'] })

const PRODUCT_PATTERNS = [
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

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeSmsProduct(product) {
  const trimmed = normalizeWhitespace(product)
  const yearMatch = trimmed.match(/\((20\d{2})\)\s*$/)
  const yearSuffix = yearMatch ? ` (${yearMatch[1]})` : ''
  const base = yearMatch ? normalizeWhitespace(trimmed.slice(0, yearMatch.index)) : trimmed

  for (const { pattern, product: normalized } of PRODUCT_PATTERNS) {
    if (pattern.test(base)) return `${normalized}${yearSuffix}`
  }

  return `${base}${yearSuffix}`
}

async function main() {
  const rows = await prisma.smsPrice.findMany({
    select: { id: true, product: true },
    orderBy: { id: 'asc' },
  })

  const updates = rows
    .map((row) => ({
      id: row.id,
      before: row.product,
      after: normalizeSmsProduct(row.product),
    }))
    .filter((row) => row.before !== row.after)

  if (updates.length === 0) {
    console.log('No SMS product rows needed normalization.')
    return
  }

  for (const row of updates) {
    await prisma.smsPrice.update({
      where: { id: row.id },
      data: { product: row.after },
    })
  }

  console.log(`Normalized ${updates.length} SMS product rows.`)
  for (const row of updates.slice(0, 20)) {
    console.log(`#${row.id}: ${row.before} -> ${row.after}`)
  }
  if (updates.length > 20) {
    console.log(`...and ${updates.length - 20} more`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

