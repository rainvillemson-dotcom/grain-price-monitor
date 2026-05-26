import type { MarketDataPoint, MarketLatest, MarketSeries, MarketResponse } from './types'
import { isoDateInAppZone } from './date'

export type Period = '1mo' | '3mo' | '6mo' | '1y' | '2y'

// Tickers whose historical data comes from Yahoo Finance time series
const CHART_TICKERS = {
  'ZW=F': { label: 'CBOT Nisu (ref)', color: '#3fb950' },
  'EURUSD=X': { label: 'EUR/USD', color: '#58a6ff' },
} as const

// Tickers that only expose current price via meta (MATIF Euronext)
const META_ONLY_TICKERS = {
  'EBM.PA': { label: 'MATIF Nisu', color: '#3fb950' },
  'ECO.PA': { label: 'MATIF Raps', color: '#d29922' },
} as const

export const TICKER_META: Record<string, { label: string; color: string }> = {
  ...CHART_TICKERS,
  ...META_ONLY_TICKERS,
}

export const GRAIN_TICKERS = ['EBM.PA', 'ECO.PA'] as const
export type GrainTicker = (typeof GRAIN_TICKERS)[number]

// 1 bushel = 27.2155 kg → 1 ton = 36.744 bushels; CBOT prices are in USX (cents/bu)
const CBOT_TO_EUR_TON = (usx: number, eurusd: number) =>
  Math.round((usx * 36.744) / eurusd / 100 * 100) / 100

interface YahooChartResult {
  meta: {
    regularMarketPrice: number
    chartPreviousClose: number
    currency: string
  }
  timestamp?: number[]
  indicators: {
    quote: Array<{ close: (number | null)[] }>
  }
}

interface YahooResponse {
  chart: {
    result: YahooChartResult[] | null
    error: { code: string; description: string } | null
  }
}

function tsToDate(ts: number): string {
  return new Date(ts * 1000).toISOString().split('T')[0]
}

function today(): string {
  return isoDateInAppZone()
}

async function yahooFetch(ticker: string, period: Period): Promise<YahooChartResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${period}&includePrePost=false`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 1800 },
  })

  if (!res.ok) throw new Error(`Yahoo Finance ${ticker}: HTTP ${res.status}`)

  const json = (await res.json()) as YahooResponse

  if (json.chart.error) throw new Error(json.chart.error.description)
  if (!json.chart.result?.[0]) throw new Error(`No result for ${ticker}`)

  return json.chart.result[0]
}

/** Fetch ticker that has real time-series data (ZW=F, EURUSD=X) */
export async function fetchTickerRaw(
  ticker: string,
  period: Period
): Promise<{ dates: string[]; prices: number[] }> {
  const result = await yahooFetch(ticker, period)

  const timestamps = result.timestamp ?? []
  const closes = result.indicators.quote[0]?.close ?? []

  if (timestamps.length === 0) {
    // Fall back to single meta price if no time series
    const price = result.meta.regularMarketPrice
    if (price) return { dates: [today()], prices: [Math.round(price * 100) / 100] }
    return { dates: [], prices: [] }
  }

  const dates: string[] = []
  const prices: number[] = []

  for (let i = 0; i < timestamps.length; i++) {
    const p = closes[i]
    if (p !== null && p !== undefined && !isNaN(p)) {
      dates.push(tsToDate(timestamps[i]))
      prices.push(Math.round(p * 100) / 100)
    }
  }

  return { dates, prices }
}

/** Fetch MATIF ticker — returns only current meta price */
async function fetchMetaPrice(ticker: string): Promise<{ price: number; prevClose: number } | null> {
  try {
    const result = await yahooFetch(ticker, '1mo')
    const price = result.meta.regularMarketPrice
    const prevClose = result.meta.chartPreviousClose ?? price
    if (!price) return null
    return { price: Math.round(price * 100) / 100, prevClose: Math.round(prevClose * 100) / 100 }
  } catch {
    return null
  }
}

function calcLatest(prices: number[], dates: string[]): MarketLatest {
  const n = prices.length
  if (n === 0) return { price: 0, change: 0, changePct: 0, date: '' }
  const price = prices[n - 1]
  const prev = n >= 2 ? prices[n - 2] : price
  const change = Math.round((price - prev) * 100) / 100
  const changePct = prev !== 0 ? Math.round((change / prev) * 10000) / 100 : 0
  return { price, change, changePct, date: dates[n - 1] }
}

function buildMatifLatest(meta: { price: number; prevClose: number }): MarketLatest {
  const change = Math.round((meta.price - meta.prevClose) * 100) / 100
  const changePct =
    meta.prevClose !== 0
      ? Math.round((change / meta.prevClose) * 10000) / 100
      : 0
  return { price: meta.price, change, changePct, date: today() }
}

/** Scale price series so the last value matches targetPrice (anchors trend to MATIF spot) */
function scaleToTarget(prices: number[], targetPrice: number): number[] {
  const last = prices[prices.length - 1]
  if (!last || last === 0) return prices
  const factor = targetPrice / last
  return prices.map((p) => Math.round(p * factor * 100) / 100)
}

export async function fetchMarketData(period: Period = '3mo'): Promise<MarketResponse> {
  const [zwResult, zsResult, eurusdResult, ebmMeta, ecoMeta] = await Promise.allSettled([
    fetchTickerRaw('ZW=F', period),   // CBOT wheat -> nisu graafik
    fetchTickerRaw('ZS=F', period),   // CBOT sojauba -> raps proxy graafik
    fetchTickerRaw('EURUSD=X', period),
    fetchMetaPrice('EBM.PA'),
    fetchMetaPrice('ECO.PA'),
  ])

  // EUR/USD
  let eurusdData: MarketDataPoint[] = []
  let eurusdLatest: MarketLatest = { price: 0, change: 0, changePct: 0, date: '' }
  let latestEurusd = 1.12

  if (eurusdResult.status === 'fulfilled' && eurusdResult.value.prices.length > 0) {
    const { dates, prices } = eurusdResult.value
    eurusdData = dates.map((date, i) => ({ date, price: prices[i] }))
    eurusdLatest = calcLatest(prices, dates)
    latestEurusd = prices[prices.length - 1]
  }

  const series: MarketSeries[] = []

  // ── Nisu: ZW=F konverteeritud EUR/t, ankurdatud MATIF EBM.PA hetkehinnal ──
  if (zwResult.status === 'fulfilled' && zwResult.value.prices.length > 0) {
    const { dates, prices } = zwResult.value
    const raw = prices.map((p) => CBOT_TO_EUR_TON(p, latestEurusd))
    const ebm = ebmMeta.status === 'fulfilled' ? ebmMeta.value : null
    const anchored = ebm ? scaleToTarget(raw, ebm.price) : raw
    const data: MarketDataPoint[] = dates.map((date, i) => ({ date, price: anchored[i] }))
    const latest = ebm ? buildMatifLatest(ebm) : calcLatest(anchored, dates)
    series.push({ ticker: 'EBM.PA', label: 'MATIF Nisu', color: '#3fb950', data, latest })
  }

  // ── Raps: ZS=F konverteeritud EUR/t, ankurdatud MATIF ECO.PA hetkehinnal ──
  if (zsResult.status === 'fulfilled' && zsResult.value.prices.length > 0) {
    const { dates, prices } = zsResult.value
    const raw = prices.map((p) => CBOT_TO_EUR_TON(p, latestEurusd))
    const eco = ecoMeta.status === 'fulfilled' ? ecoMeta.value : null
    const anchored = eco ? scaleToTarget(raw, eco.price) : raw
    const data: MarketDataPoint[] = dates.map((date, i) => ({ date, price: anchored[i] }))
    const latest = eco ? buildMatifLatest(eco) : calcLatest(anchored, dates)
    series.push({ ticker: 'ECO.PA', label: 'MATIF Raps', color: '#d29922', data, latest })
  }

  return {
    series,
    eurusd: { data: eurusdData, latest: eurusdLatest },
    source: 'live',
  }
}
