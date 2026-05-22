export interface MarketDataPoint {
  date: string
  price: number
}

export interface MarketLatest {
  price: number
  change: number
  changePct: number
  date: string
}

export interface MarketSeries {
  ticker: string
  label: string
  color: string
  data: MarketDataPoint[]
  latest: MarketLatest
}

export interface MarketResponse {
  series: MarketSeries[]
  eurusd: {
    data: MarketDataPoint[]
    latest: MarketLatest
  }
  source?: 'live' | 'cache'
}

export interface ParsedItem {
  product: string
  price: number
  unit: string
  location?: string
}

export interface ParseResult {
  source: string
  date: string
  items: ParsedItem[]
  raw: string
  warnings?: string[]
}

export interface SmsPriceRecord {
  id: number
  source: string
  product: string
  price: number
  unit: string
  location: string | null
  rawSms: string
  date: string
  createdAt: string
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParseError'
  }
}
