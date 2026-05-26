'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { MarketSeries, SmsPriceRecord } from '@/lib/types'
import { formatIsoDate } from '@/lib/date'
import { getSmsBaseProduct, SMS_PRODUCTS } from '@/lib/smsProducts'

interface PriceChartProps {
  matifData: MarketSeries[]
  smsData: SmsPriceRecord[]
  period: string
  onPeriodChange: (p: string) => void
}

const PRODUCT_STORAGE_KEY = 'marketChartProducts'
const MARKET_TICKER_PRODUCTS: Record<string, string> = {
  'EBM.PA': 'Nisu',
  'ECO.PA': 'Raps',
}

const PERIODS = [
  { value: '1d',  label: 'Täna' },
  { value: '7d',  label: '7 päeva' },
  { value: '1mo', label: '1 kuu' },
  { value: '3mo', label: '3 kuud' },
  { value: '6mo', label: '6 kuud' },
  { value: '1y',  label: '1 aasta' },
  { value: '2y',  label: '2 aastat' },
]

// Tagastab ISO kuupäeva (YYYY-MM-DD) mis on `days` päeva tagasi
function cutoffDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days + 1) // kaasaarvamine tänane
  return d.toISOString().split('T')[0]
}

function periodCutoff(period: string): string | null {
  if (period === '1d')  return cutoffDate(1)
  if (period === '7d')  return cutoffDate(7)
  return null
}

// Allikate värvid — iga allikas saab oma värvitooni
const SOURCE_COLORS: Record<string, string> = {
  Scandagra:    '#3fb950', // roheline
  'Baltic Agro':'#58a6ff', // sinine
  Kevili:       '#d29922', // kollane
  Viljaekspert: '#f0883e', // oranž
  Muu:          '#8b949e', // hall
}

// Sama allika eri toodete jaoks heledamad/tumedamad toonid
const SOURCE_PRODUCT_SHADES: Record<string, string[]> = {
  Scandagra:    ['#3fb950','#57d968','#2ea043','#76e680','#1a7a2e','#a3f5b0'],
  'Baltic Agro':['#58a6ff','#79bcff','#388bfd','#a5d0ff','#1f6feb','#cce5ff'],
  Kevili:       ['#d29922','#e3b341','#b08800','#f0cd5a','#8a6900','#f5dfa5'],
  Viljaekspert: ['#f0883e','#f5a26a','#c96c2a','#fab38c','#a05520','#fdd4b8'],
  Muu:          ['#8b949e','#a0aab4','#768390','#b4bbc4','#5c6870','#d1d7dc'],
}

function getSmsColor(source: string, product: string, productIndex: number): string {
  const shades = SOURCE_PRODUCT_SHADES[source] ?? SOURCE_PRODUCT_SHADES['Muu']
  return shades[productIndex % shades.length]
}

// Allikas+toode identifikaator graafikuvõtmena
const SMS_PREFIX = 'sms__'
const SMS_SEP = '\x00' // null byte — ei esine toote nimedes

function smsChartKey(source: string, product: string): string {
  return `${SMS_PREFIX}${source}${SMS_SEP}${product}`
}

function parseSmsChartKey(key: string): { source: string; product: string } {
  const inner = key.slice(SMS_PREFIX.length)
  const idx = inner.indexOf(SMS_SEP)
  return { source: inner.slice(0, idx), product: inner.slice(idx + 1) }
}

function formatXAxis(date: string): string {
  return formatIsoDate(date, 'et-EE', { day: '2-digit', month: '2-digit' })
}

function formatTooltipDate(date: string): string {
  return formatIsoDate(date, 'et-EE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

type ChartRow = Record<string, number | string>

interface SmsSeries {
  key: string
  source: string
  product: string
  color: string
}

function buildChartData(
  grainSeries: MarketSeries[],
  smsData: SmsPriceRecord[]
): { rows: ChartRow[]; smsSeries: SmsSeries[] } {
  const map = new Map<string, ChartRow>()

  // MATIF andmed
  for (const s of grainSeries) {
    for (const pt of s.data) {
      const row = map.get(pt.date) ?? { date: pt.date }
      row[s.ticker] = pt.price
      map.set(pt.date, row)
    }
  }

  // SMS andmed — grupeeri allikas+toode+kuupäev järgi, arvuta keskmine
  const smsAgg = new Map<string, { sum: number; count: number }>()
  for (const r of smsData) {
    const key = `${r.date}${SMS_SEP}${r.source}${SMS_SEP}${r.product}`
    const ex = smsAgg.get(key) ?? { sum: 0, count: 0 }
    ex.sum += r.price
    ex.count += 1
    smsAgg.set(key, ex)
  }

  for (const [aggKey, { sum, count }] of smsAgg) {
    const [date, source, product] = aggKey.split(SMS_SEP)
    const chartKey = smsChartKey(source, product)
    const row = map.get(date) ?? { date }
    row[chartKey] = Math.round((sum / count) * 100) / 100
    map.set(date, row)
  }

  const rows = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row)

  // Unikaalsed SMS seeriad — allikas+toode kombinatsioonid
  const seriesMap = new Map<string, { source: string; product: string }>()
  for (const r of smsData) {
    const k = smsChartKey(r.source, r.product)
    if (!seriesMap.has(k)) seriesMap.set(k, { source: r.source, product: r.product })
  }

  // Grupeeri tooted allika kaupa et määrata värvitoon
  const bySource = new Map<string, string[]>()
  for (const { source, product } of seriesMap.values()) {
    const prods = bySource.get(source) ?? []
    if (!prods.includes(product)) prods.push(product)
    bySource.set(source, prods)
  }

  const smsSeries: SmsSeries[] = []
  for (const [key, { source, product }] of seriesMap) {
    const prods = bySource.get(source) ?? []
    const idx = prods.indexOf(product)
    smsSeries.push({ key, source, product, color: getSmsColor(source, product, idx) })
  }
  smsSeries.sort((a, b) => a.key.localeCompare(b.key))

  return { rows, smsSeries }
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
  dataKey: string
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-sm shadow-lg min-w-[180px]">
      <p className="text-[#8b949e] mb-2 text-xs">{label ? formatTooltipDate(label) : ''}</p>
      {payload.map((entry) => {
        const isSms = String(entry.dataKey).startsWith(SMS_PREFIX)
        const label2 = isSms
          ? (() => {
              const { source, product } = parseSmsChartKey(String(entry.dataKey))
              return `${source} ${product}`
            })()
          : entry.name
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-[#8b949e] text-xs truncate max-w-[120px]">{label2}:</span>
            <span className="text-[#e6edf3] font-medium ml-auto">
              {Number(entry.value).toFixed(2)} €/t
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function PriceChart({ matifData, smsData, period, onPeriodChange }: PriceChartProps) {
  const eurusdSeries = matifData.find((s) => s.ticker === 'EURUSD=X')
  const grainSeries = matifData.filter((s) => s.ticker !== 'EURUSD=X')
  const availableProducts = SMS_PRODUCTS.filter((product) => {
    const hasMarketSeries = grainSeries.some((series) => MARKET_TICKER_PRODUCTS[series.ticker] === product)
    const hasSmsSeries = smsData.some((row) => getSmsBaseProduct(row.product) === product)
    return hasMarketSeries || hasSmsSeries
  })
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [prefsReady, setPrefsReady] = useState(false)

  useEffect(() => {
    const fallback = new Set(availableProducts)

    try {
      const raw = localStorage.getItem(PRODUCT_STORAGE_KEY)
      if (!raw) {
        setSelectedProducts(fallback)
        setPrefsReady(true)
        return
      }

      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(
          (value): value is string => typeof value === 'string' && availableProducts.includes(value as typeof SMS_PRODUCTS[number])
        )
        setSelectedProducts(filtered.length > 0 ? new Set(filtered) : fallback)
        setPrefsReady(true)
        return
      }
    } catch {
      // Ignore invalid localStorage value and use defaults.
    }

    setSelectedProducts(fallback)
    setPrefsReady(true)
  }, [availableProducts.join('|')])

  useEffect(() => {
    if (!prefsReady) return
    try {
      localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(Array.from(selectedProducts)))
    } catch {
      // Ignore localStorage write errors.
    }
  }, [prefsReady, selectedProducts])

  // Kuupäevafilter lühiperioodide jaoks (1d, 7d)
  const cutoff = periodCutoff(period)

  const visibleGrainSeries = grainSeries
    .filter((series) => selectedProducts.has(MARKET_TICKER_PRODUCTS[series.ticker] ?? series.label))
    .map((series) => cutoff
      ? { ...series, data: series.data.filter((pt) => pt.date >= cutoff) }
      : series
    )
  const visibleSmsData = smsData
    .filter((row) => selectedProducts.has(getSmsBaseProduct(row.product)))
    .filter((row) => !cutoff || row.date >= cutoff)

  const { rows: chartData, smsSeries } = buildChartData(visibleGrainSeries, visibleSmsData)

  const allPrices = [
    ...visibleGrainSeries.flatMap((s) => s.data.map((d) => d.price)),
    ...visibleSmsData.map((r) => r.price),
  ].filter(Boolean)
  const yMin = allPrices.length ? Math.floor(Math.min(...allPrices) * 0.95) : 'auto'
  const yMax = allPrices.length ? Math.ceil(Math.max(...allPrices) * 1.05) : 'auto'
  const hasVisibleSeries = visibleGrainSeries.length > 0 || smsSeries.length > 0

  const toggleProduct = (product: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(product)) next.delete(product)
      else next.add(product)
      return next
    })
  }

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-4">
      {/* Perioodi valik — horisontaalselt keritav, ei murdu */}
      <div
        className="flex gap-2 overflow-x-auto pb-0.5"
        style={{ flexWrap: 'nowrap', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={`flex-shrink-0 px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${
              period === p.value
                ? 'border border-[#3fb950] bg-[#0d1117] text-[#3fb950] font-medium'
                : 'border border-[#30363d] text-[#8b949e]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {availableProducts.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() =>
              selectedProducts.size < availableProducts.length
                ? setSelectedProducts(new Set(availableProducts))
                : setSelectedProducts(new Set())
            }
            className="touch-target px-3 py-1 text-sm rounded-lg transition-colors cursor-pointer"
            style={{ border: '1px solid #30363d', color: '#8b949e' }}
          >
            Kõik
          </button>
          {availableProducts.map((product) => {
            const active = selectedProducts.has(product)
            return (
              <button
                key={product}
                onClick={() => toggleProduct(product)}
                className="touch-target px-3 py-1 text-sm rounded-lg transition-colors cursor-pointer"
                style={
                  active
                    ? { backgroundColor: '#0d1117', border: '1px solid #3fb950', color: '#3fb950' }
                    : { backgroundColor: 'transparent', border: '1px solid #30363d', color: '#8b949e' }
                }
              >
                {product}
              </button>
            )
          })}
        </div>
      )}

      {/* Peamine graafik */}
      <div className="h-72">
        {!hasVisibleSeries ? (
          <div className="h-full flex items-center justify-center text-[#484f58] text-sm border border-dashed border-[#30363d] rounded-lg">
            Vali vähemalt üks toode, mida graafikul kuvada
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                tick={{ fill: '#8b949e', fontSize: 11 }}
                axisLine={{ stroke: '#30363d' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fill: '#8b949e', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}`}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />

              {visibleGrainSeries.map((s) => (
                <Line
                  key={s.ticker}
                  type="monotone"
                  dataKey={s.ticker}
                  name={s.label}
                  stroke={s.color}
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                />
              ))}

              {smsSeries.map(({ key, color }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  isAnimationActive={false}
                  dot={(props: { cx: number; cy: number; index: number }) => {
                    if (!props.cy || isNaN(props.cy)) return <g key={props.index} />
                    return (
                      <circle
                        key={props.index}
                        cx={props.cx}
                        cy={props.cy}
                        r={5}
                        fill={color}
                        stroke="#0d1117"
                        strokeWidth={1.5}
                      />
                    )
                  }}
                  activeDot={{ r: 6, fill: color }}
                  connectNulls
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* EUR/USD minigraafik */}
      {eurusdSeries && eurusdSeries.data.length > 0 && (
        <div>
          <p className="text-[#8b949e] text-xs mb-1">EUR/USD</p>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={eurusdSeries.data}
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxis}
                  tick={{ fill: '#8b949e', fontSize: 10 }}
                  axisLine={{ stroke: '#30363d' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#8b949e', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  width={42}
                  tickFormatter={(v: number) => v.toFixed(3)}
                />
                <Tooltip
                  content={({ active, payload, label: lbl }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-[#161b22] border border-[#30363d] rounded p-2 text-xs">
                        <p className="text-[#8b949e]">{lbl ? formatTooltipDate(lbl) : ''}</p>
                        <p className="text-[#58a6ff] font-medium">
                          {Number(payload[0]?.value).toFixed(4)}
                        </p>
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#58a6ff"
                  dot={false}
                  strokeWidth={1.5}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
