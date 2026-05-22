import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchTickerRaw, GRAIN_TICKERS } from '@/lib/yahoo'
import { fetchAllExchangeData } from '@/lib/exchange'

const ALL_TICKERS = [...GRAIN_TICKERS, 'EURUSD=X'] as const

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`

  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let updated = 0
  const errors: string[] = []

  // ── MarketPrice upserts (existing logic) ──
  for (const ticker of ALL_TICKERS) {
    try {
      const { dates, prices } = await fetchTickerRaw(ticker, '3mo')

      const upserts = dates.map((date, i) =>
        prisma.marketPrice.upsert({
          where: { ticker_date: { ticker, date } },
          update: { price: prices[i] },
          create: { ticker, date, price: prices[i] },
        })
      )

      await prisma.$transaction(upserts)
      updated += dates.length
    } catch (e) {
      errors.push(`${ticker}: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  // ── ExchangePrice upserts ──
  try {
    const exchangeData = await fetchAllExchangeData('3mo')

    for (const inst of exchangeData.instruments) {
      if (inst.latest.price === 0) continue

      try {
        // Upsert latest price
        await prisma.exchangePrice.upsert({
          where: { ticker_date: { ticker: inst.ticker, date: inst.latest.updatedAt } },
          update: {
            close: inst.latest.price,
            change: inst.latest.change,
            changePct: inst.latest.changePct,
            high: inst.latest.high,
            low: inst.latest.low,
          },
          create: {
            ticker: inst.ticker,
            label: inst.label,
            exchange: inst.exchange,
            unit: inst.unit,
            date: inst.latest.updatedAt,
            close: inst.latest.price,
            change: inst.latest.change,
            changePct: inst.latest.changePct,
            high: inst.latest.high,
            low: inst.latest.low,
          },
        })
        updated++
      } catch (e) {
        errors.push(`exchange ${inst.ticker}: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }

      // Upsert historical data points
      for (const point of inst.history) {
        try {
          await prisma.exchangePrice.upsert({
            where: { ticker_date: { ticker: inst.ticker, date: point.date } },
            update: { close: point.price },
            create: {
              ticker: inst.ticker,
              label: inst.label,
              exchange: inst.exchange,
              unit: inst.unit,
              date: point.date,
              close: point.price,
              change: null,
              changePct: null,
              high: null,
              low: null,
            },
          })
          updated++
        } catch {
          // Skip duplicate/conflict rows silently
        }
      }
    }
  } catch (e) {
    errors.push(`exchange fetch: ${e instanceof Error ? e.message : 'Unknown error'}`)
  }

  return NextResponse.json({ updated, errors })
}
