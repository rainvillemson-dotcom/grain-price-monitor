import { NextResponse } from 'next/server'
import { fetchAllExchangeData } from '@/lib/exchange'
import { prisma } from '@/lib/db'

function formatTime(d: Date): string {
  return d.toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export async function POST() {
  try {
    // Rate limit: 15 minutes
    const since = new Date()
    since.setMinutes(since.getMinutes() - 15)

    let recentCount = 0
    let oldestAllowed: Date | null = null

    try {
      const recent = await prisma.exchangePrice.findFirst({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
      })

      if (recent) {
        const nextAllowed = new Date(recent.createdAt)
        nextAllowed.setMinutes(nextAllowed.getMinutes() + 15)
        oldestAllowed = nextAllowed
        recentCount = 1
      }
    } catch {
      // DB unavailable, allow fetch
    }

    if (recentCount > 0 && oldestAllowed) {
      return NextResponse.json(
        {
          error: 'Rate limit: oota 15 minutit',
          nextAllowed: oldestAllowed.toISOString(),
        },
        { status: 429 }
      )
    }

    // Fetch fresh data using short period to capture recent prices
    const data = await fetchAllExchangeData('5d')

    let updated = 0

    try {
      for (const inst of data.instruments) {
        if (inst.latest.price === 0) continue

        // Upsert latest price row
        await prisma.exchangePrice.upsert({
          where: {
            ticker_date: {
              ticker: inst.ticker,
              date: inst.latest.updatedAt,
            },
          },
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

        // Also upsert historical data points
        for (const point of inst.history) {
          try {
            await prisma.exchangePrice.upsert({
              where: {
                ticker_date: {
                  ticker: inst.ticker,
                  date: point.date,
                },
              },
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
          } catch {
            // Skip duplicate/conflict rows silently
          }
        }
      }
    } catch {
      // DB unavailable — still return the live data
    }

    return NextResponse.json({
      ok: true,
      updated,
      updatedAt: formatTime(new Date()),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
