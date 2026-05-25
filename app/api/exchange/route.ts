import { NextRequest, NextResponse } from 'next/server'
import { fetchAllExchangeData, type ExchangeResponse, type ExchangeData, type ExchangeLatest, EXCHANGE_INSTRUMENTS } from '@/lib/exchange'
import { prisma } from '@/lib/db'

function formatTime(d: Date): string {
  return d.toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

async function tryLoadFromCache(): Promise<ExchangeResponse | null> {
  const since = new Date()
  since.setHours(since.getHours() - 24)

  const rows = await prisma.exchangePrice.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { date: 'asc' },
  })

  if (rows.length === 0) return null

  // Build ExchangeData per ticker from DB rows
  const byTicker = new Map<string, typeof rows>()
  for (const row of rows) {
    const arr = byTicker.get(row.ticker) ?? []
    arr.push(row)
    byTicker.set(row.ticker, arr)
  }

  const INST_MAP = new Map(EXCHANGE_INSTRUMENTS.map((i) => [i.ticker, i]))

  const instruments: ExchangeData[] = []
  for (const inst of EXCHANGE_INSTRUMENTS) {
    const tickerRows = byTicker.get(inst.ticker) ?? []
    if (tickerRows.length === 0) continue

    // Latest row = last by date
    const sorted = [...tickerRows].sort((a, b) => a.date.localeCompare(b.date))
    const lastRow = sorted[sorted.length - 1]

    const latest: ExchangeLatest = {
      price: lastRow.close,
      change: lastRow.change ?? 0,
      changePct: lastRow.changePct ?? 0,
      high: lastRow.high,
      low: lastRow.low,
      updatedAt: lastRow.date,
    }

    const history = sorted
      .filter((r) => r.close > 0)
      .map((r) => ({ date: r.date, price: r.close }))

    const meta = INST_MAP.get(inst.ticker)
    instruments.push({
      ticker: inst.ticker,
      label: meta?.label ?? lastRow.label,
      exchange: meta?.exchange ?? lastRow.exchange,
      unit: meta?.unit ?? lastRow.unit,
      color: meta?.color ?? '#8b949e',
      group: meta?.group ?? 'other',
      latest,
      history,
    })
  }

  if (instruments.length === 0) return null

  const latestCreated = rows.reduce<Date>((max, r) => (r.createdAt > max ? r.createdAt : max), rows[0].createdAt)

  return {
    updatedAt: formatTime(latestCreated),
    instruments,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const periodParam = searchParams.get('period') ?? '1y'
    const validPeriods = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y'] as const
    type ValidPeriod = (typeof validPeriods)[number]
    const period: ValidPeriod = (validPeriods as readonly string[]).includes(periodParam)
      ? (periodParam as ValidPeriod)
      : '1y'

    // DB cache only holds daily data — skip for intraday periods
    const isIntraday = period === '1d' || period === '5d'
    if (!isIntraday) {
      try {
        const cached = await tryLoadFromCache()
        if (cached && cached.instruments.length > 0) {
          return NextResponse.json(cached, {
            headers: { 'X-Data-Source': 'cache' },
          })
        }
      } catch {
        // DB unavailable, continue to live fetch
      }
    }

    const data = await fetchAllExchangeData(period)
    return NextResponse.json(data, {
      headers: { 'X-Data-Source': 'live' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
