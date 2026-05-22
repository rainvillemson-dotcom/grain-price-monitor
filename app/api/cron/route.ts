import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchTickerRaw, GRAIN_TICKERS } from '@/lib/yahoo'

const ALL_TICKERS = [...GRAIN_TICKERS, 'EURUSD=X'] as const

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`

  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let updated = 0
  const errors: string[] = []

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

  return NextResponse.json({ updated, errors })
}
