import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchMarketData, type Period } from '@/lib/yahoo'
import { prisma } from '@/lib/db'
import { isoDateInAppZone } from '@/lib/date'
import type { MarketDataPoint, MarketResponse, MarketSeries, MarketLatest } from '@/lib/types'

const VALID_PERIODS: Period[] = ['1mo', '3mo', '6mo', '1y', '2y']

const QuerySchema = z.object({
  period: z.enum(['1mo', '3mo', '6mo', '1y', '2y']).default('3mo'),
})

function calcLatest(rows: { date: string; price: number }[]): MarketLatest {
  const n = rows.length
  if (n === 0) return { price: 0, change: 0, changePct: 0, date: '' }
  const price = rows[n - 1].price
  const prev = n >= 2 ? rows[n - 2].price : price
  const change = Math.round((price - prev) * 100) / 100
  const changePct = prev !== 0 ? Math.round((change / prev) * 10000) / 100 : 0
  return { price, change, changePct, date: rows[n - 1].date }
}

async function tryLoadFromCache(
  period: Period
): Promise<MarketResponse | null> {
  const rangeMap: Record<Period, number> = {
    '1mo': 31,
    '3mo': 92,
    '6mo': 184,
    '1y': 366,
    '2y': 732,
  }
  const daysBack = rangeMap[period]
  const since = new Date()
  since.setDate(since.getDate() - daysBack)
  const sinceStr = isoDateInAppZone(since)

  const dbRows = await prisma.marketPrice.findMany({
    where: { date: { gte: sinceStr } },
    orderBy: { date: 'asc' },
  })

  if (dbRows.length === 0) return null

  const byTicker = new Map<string, MarketDataPoint[]>()
  for (const row of dbRows) {
    const arr = byTicker.get(row.ticker) ?? []
    arr.push({ date: row.date, price: row.price })
    byTicker.set(row.ticker, arr)
  }

  const TICKER_META: Record<string, { label: string; color: string }> = {
    'EBM.PA': { label: 'Nisu', color: '#3fb950' },
    'ECO.PA': { label: 'Raps', color: '#d29922' },
    'EURUSD=X': { label: 'EUR/USD', color: '#58a6ff' },
  }

  const series: MarketSeries[] = []
  for (const [ticker, data] of byTicker) {
    if (ticker === 'EURUSD=X') continue
    const meta = TICKER_META[ticker]
    if (!meta) continue
    series.push({ ticker, label: meta.label, color: meta.color, data, latest: calcLatest(data) })
  }

  const eurusdData = byTicker.get('EURUSD=X') ?? []

  const hasCompleteHistory =
    series.length >= 2 &&
    series.every((item) => item.data.length >= 5) &&
    eurusdData.length >= 5

  if (!hasCompleteHistory) return null

  return {
    series,
    eurusd: { data: eurusdData, latest: calcLatest(eurusdData) },
    source: 'cache',
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const parsed = QuerySchema.safeParse({ period: searchParams.get('period') ?? '3mo' })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid period parameter' }, { status: 400 })
    }

    const period = parsed.data.period

    // Try cache first
    try {
      const cached = await tryLoadFromCache(period)
      if (cached && cached.series.length > 0) {
        return NextResponse.json(cached, {
          headers: { 'X-Data-Source': 'cache' },
        })
      }
    } catch {
      // DB not available, skip cache
    }

    // Fetch live from Yahoo Finance
    const data = await fetchMarketData(period)
    return NextResponse.json(data, {
      headers: { 'X-Data-Source': 'live' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Ensure VALID_PERIODS is used (avoids unused import warning)
void VALID_PERIODS
