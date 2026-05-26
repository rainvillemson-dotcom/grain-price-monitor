import { isoDateInAppZone } from './date'

export const EXCHANGE_INSTRUMENTS = [
  { ticker: 'EBM.PA', label: 'MATIF Nisu', exchange: 'MATIF', unit: 'EUR/t', color: '#3fb950', group: 'matif' },
  { ticker: 'ECO.PA', label: 'MATIF Raps', exchange: 'MATIF', unit: 'EUR/t', color: '#d29922', group: 'matif' },
  { ticker: 'ZW=F',   label: 'CBOT Nisu',  exchange: 'CBOT',  unit: 'USDc/bu', color: '#58a6ff', group: 'cbot' },
  { ticker: 'ZS=F',   label: 'CBOT Sojauba', exchange: 'CBOT', unit: 'USDc/bu', color: '#bc8cff', group: 'cbot' },
  { ticker: 'ZC=F',   label: 'CBOT Mais',  exchange: 'CBOT',  unit: 'USDc/bu', color: '#f0883e', group: 'cbot' },
  { ticker: 'CL=F',   label: 'WTI Toorõli', exchange: 'WTI', unit: 'USD/bbl', color: '#e85151', group: 'oil' },
  { ticker: 'EURUSD=X', label: 'EUR/USD', exchange: 'FX', unit: 'USD/EUR', color: '#39d353', group: 'fx' },
] as const

export type ExchangeTicker = (typeof EXCHANGE_INSTRUMENTS)[number]['ticker']

export interface ExchangeLatest {
  price: number
  change: number
  changePct: number
  high: number | null
  low: number | null
  updatedAt: string // ISO date "2026-05-22"
}

export interface ExchangeDataPoint {
  date: string
  price: number
}

export interface ExchangeData {
  ticker: string
  label: string
  exchange: string
  unit: string
  color: string
  group: string
  latest: ExchangeLatest
  history: ExchangeDataPoint[]
}

export interface ExchangeResponse {
  updatedAt: string // "16:45" formatted
  instruments: ExchangeData[]
}

// Tickers that have meta price but no historical timestamps
const META_ONLY_TICKERS = new Set(['EBM.PA', 'ECO.PA'])

type Period = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y'

function getInterval(period: Period): string {
  if (period === '1d') return '5m'
  if (period === '5d') return '1h'
  return '1d'
}

function tsToLabel(ts: number, isIntraday: boolean): string {
  const d = new Date(ts * 1000)
  if (isIntraday) return d.toISOString().slice(0, 16) // "2026-05-22T14:30"
  return d.toISOString().split('T')[0]
}

interface YahooChartMeta {
  regularMarketPrice: number
  chartPreviousClose: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  currency: string
}

interface YahooChartResult {
  meta: YahooChartMeta
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

function todayISO(): string {
  return isoDateInAppZone()
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

async function yahooFetch(ticker: string, period: Period): Promise<YahooChartResult> {
  const interval = getInterval(period)
  const revalidate = period === '1d' ? 300 : 900
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${period}&includePrePost=false`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate },
  })

  if (!res.ok) throw new Error(`Yahoo Finance ${ticker}: HTTP ${res.status}`)

  const json = (await res.json()) as YahooResponse

  if (json.chart.error) throw new Error(json.chart.error.description)
  if (!json.chart.result?.[0]) throw new Error(`No result for ${ticker}`)

  return json.chart.result[0]
}

export async function fetchExchangeInstrument(
  instrument: (typeof EXCHANGE_INSTRUMENTS)[number],
  period: Period
): Promise<ExchangeData> {
  const { ticker, label, exchange, unit, color, group } = instrument

  const result = await yahooFetch(ticker, period)
  const meta = result.meta

  const price = Math.round(meta.regularMarketPrice * 10000) / 10000
  const prevClose = meta.chartPreviousClose ?? price
  const change = Math.round((price - prevClose) * 10000) / 10000
  const changePct = prevClose !== 0 ? Math.round((change / prevClose) * 100000) / 1000 : 0
  const high = meta.regularMarketDayHigh != null ? Math.round(meta.regularMarketDayHigh * 100) / 100 : null
  const low = meta.regularMarketDayLow != null ? Math.round(meta.regularMarketDayLow * 100) / 100 : null

  const latest: ExchangeLatest = {
    price,
    change,
    changePct,
    high,
    low,
    updatedAt: todayISO(),
  }

  let history: ExchangeDataPoint[] = []
  const isIntraday = period === '1d' || period === '5d'

  if (!META_ONLY_TICKERS.has(ticker)) {
    const timestamps = result.timestamp ?? []
    const closes = result.indicators.quote[0]?.close ?? []

    for (let i = 0; i < timestamps.length; i++) {
      const p = closes[i]
      if (p !== null && p !== undefined && !isNaN(p)) {
        history.push({
          date: tsToLabel(timestamps[i], isIntraday),
          price: Math.round(p * 10000) / 10000,
        })
      }
    }
  }

  return { ticker, label, exchange, unit, color, group, latest, history }
}

export async function fetchAllExchangeData(period: Period = '1y'): Promise<ExchangeResponse> {
  const results = await Promise.allSettled(
    EXCHANGE_INSTRUMENTS.map((inst) => fetchExchangeInstrument(inst, period))
  )

  const instruments: ExchangeData[] = []

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'fulfilled') {
      instruments.push(r.value)
    } else {
      // Return a placeholder for failed instruments so the array stays aligned
      const inst = EXCHANGE_INSTRUMENTS[i]
      instruments.push({
        ticker: inst.ticker,
        label: inst.label,
        exchange: inst.exchange,
        unit: inst.unit,
        color: inst.color,
        group: inst.group,
        latest: { price: 0, change: 0, changePct: 0, high: null, low: null, updatedAt: todayISO() },
        history: [],
      })
    }
  }

  const updatedAt = formatTime(new Date())

  return { updatedAt, instruments }
}
