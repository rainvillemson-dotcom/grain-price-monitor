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

const SMS_COLORS: Record<string, string> = {
  Nisu: '#3fb950',
  Raps: '#d29922',
  Oder: '#58a6ff',
  Kaer: '#a371f7',
  Rukis: '#f0883e',
  Hernes: '#39d353',
  Uba: '#ff7b72',
}

// SMS series key prefix to avoid collision with MATIF ticker keys
const SMS_PREFIX = 'sms__'

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

/**
 * Merge MATIF series + SMS prices into a single array keyed by date.
 * MATIF keys: ticker (e.g. "EBM.PA")
 * SMS keys:   "sms__<Product>" (e.g. "sms__Nisu")
 */
function buildChartData(
  grainSeries: MarketSeries[],
  smsData: SmsPriceRecord[]
): ChartRow[] {
  const map = new Map<string, ChartRow>()

  // Add MATIF data
  for (const s of grainSeries) {
    for (const pt of s.data) {
      const row = map.get(pt.date) ?? { date: pt.date }
      row[s.ticker] = pt.price
      map.set(pt.date, row)
    }
  }

  // Add SMS data — average by product+date if multiple entries
  const smsByDateProduct = new Map<string, { sum: number; count: number }>()
  for (const r of smsData) {
    const key = `${r.date}||${r.product}`
    const existing = smsByDateProduct.get(key) ?? { sum: 0, count: 0 }
    existing.sum += r.price
    existing.count += 1
    smsByDateProduct.set(key, existing)
  }

  for (const [key, { sum, count }] of smsByDateProduct) {
    const [date, product] = key.split('||')
    const row = map.get(date) ?? { date }
    row[`${SMS_PREFIX}${product}`] = Math.round((sum / count) * 100) / 100
    map.set(date, row)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row)
}

function smsProductsInData(smsData: SmsPriceRecord[]): string[] {
  return [...new Set(smsData.map((r) => r.product))].sort()
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-sm shadow-lg min-w-[160px]">
      <p className="text-[#8b949e] mb-2 text-xs">{label ? formatTooltipDate(label) : ''}</p>
      {payload.map((entry) => {
        const isSms = String(entry.dataKey).startsWith(SMS_PREFIX)
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: entry.color }}
            />
            <span className="text-[#8b949e] text-xs">
              {isSms ? `SMS ${entry.name}` : entry.name}:
            </span>
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
  const smsProducts = smsProductsInData(smsData)

  const chartData = buildChartData(grainSeries, smsData)

  // Y-axis domain: include both MATIF and SMS prices
  const allPrices = [
    ...grainSeries.flatMap((s) => s.data.map((d) => d.price)),
    ...smsData.map((r) => r.price),
  ].filter(Boolean)
  const yMin = allPrices.length ? Math.floor(Math.min(...allPrices) * 0.95) : 'auto'
  const yMax = allPrices.length ? Math.ceil(Math.max(...allPrices) * 1.05) : 'auto'

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-4">
      {/* Period selector */}
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

      {/* Main grain chart */}
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
                const isSms = value.startsWith(SMS_PREFIX)
                const label = isSms ? `SMS ${value.replace(SMS_PREFIX, '')}` : value
                return <span style={{ color: '#8b949e', fontSize: 12 }}>{label}</span>
              }}
            />

            {/* MATIF reference lines — solid */}
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

            {/* SMS price lines — dashed, solid dots at each data point */}
            {smsProducts.map((product) => {
              const color = SMS_COLORS[product] ?? '#8b949e'
              return (
                <Line
                  key={`${SMS_PREFIX}${product}`}
                  type="monotone"
                  dataKey={`${SMS_PREFIX}${product}`}
                  name={`${SMS_PREFIX}${product}`}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  isAnimationActive={false}
                  dot={(props: { cx: number; cy: number; index: number }) => {
                    if (props.cy === null || props.cy === undefined || isNaN(props.cy)) return <g key={props.index} />
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
              )
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* EUR/USD mini chart */}
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
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-[#161b22] border border-[#30363d] rounded p-2 text-xs">
                        <p className="text-[#8b949e]">{label ? formatTooltipDate(label) : ''}</p>
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
