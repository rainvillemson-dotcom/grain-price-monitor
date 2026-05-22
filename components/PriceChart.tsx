'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import type { MarketSeries, SmsPriceRecord } from '@/lib/types'

interface PriceChartProps {
  matifData: MarketSeries[]
  smsData: SmsPriceRecord[]
  period: string
  onPeriodChange: (p: string) => void
}

const PERIODS = [
  { value: '1mo', label: '1K' },
  { value: '3mo', label: '3K' },
  { value: '6mo', label: '6K' },
  { value: '1y', label: '1A' },
  { value: '2y', label: '2A' },
]

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
  return new Date(date).toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit' })
}

function formatTooltipDate(date: string): string {
  return new Date(date).toLocaleDateString('et-EE', {
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

  const { rows: chartData, smsSeries } = buildChartData(grainSeries, smsData)

  const allPrices = [
    ...grainSeries.flatMap((s) => s.data.map((d) => d.price)),
    ...smsData.map((r) => r.price),
  ].filter(Boolean)
  const yMin = allPrices.length ? Math.floor(Math.min(...allPrices) * 0.95) : 'auto'
  const yMax = allPrices.length ? Math.ceil(Math.max(...allPrices) * 1.05) : 'auto'

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-4">
      {/* Perioodi valik */}
      <div className="flex items-center gap-2 flex-wrap">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              period === p.value
                ? 'border border-[#3fb950] bg-[#0d1117] text-[#3fb950] font-medium'
                : 'border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#8b949e]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Peamine graafik */}
      <div className="h-72">
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
            <Legend
              formatter={(value: string) => {
                if (value.startsWith(SMS_PREFIX)) {
                  const { source, product } = parseSmsChartKey(value)
                  return (
                    <span style={{ color: SOURCE_COLORS[source] ?? '#8b949e', fontSize: 12 }}>
                      {source} {product}
                    </span>
                  )
                }
                return <span style={{ color: '#8b949e', fontSize: 12 }}>{value}</span>
              }}
            />

            {/* MATIF jooned — pidev */}
            {grainSeries.map((s) => (
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

            {/* SMS jooned — katkendlik, täpp igal punktil */}
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
