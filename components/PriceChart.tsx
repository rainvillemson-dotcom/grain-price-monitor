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
  Scatter,
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

function formatXAxis(date: string): string {
  const d = new Date(date)
  return d.toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit' })
}

function formatTooltipDate(date: string): string {
  return new Date(date).toLocaleDateString('et-EE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Merge MATIF series into single date-keyed dataset
function mergeMatifData(series: MarketSeries[]) {
  const map = new Map<string, Record<string, number>>()
  for (const s of series) {
    for (const pt of s.data) {
      const row = map.get(pt.date) ?? {}
      row[s.ticker] = pt.price
      map.set(pt.date, row)
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }))
}

// Convert SMS prices to chart scatter points
function smsByProduct(smsData: SmsPriceRecord[]) {
  const grouped: Record<string, Array<{ date: string; price: number }>> = {}
  for (const r of smsData) {
    if (!grouped[r.product]) grouped[r.product] = []
    grouped[r.product].push({ date: r.date, price: r.price })
  }
  return grouped
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-sm shadow-lg">
      <p className="text-[#8b949e] mb-2">{label ? formatTooltipDate(label) : ''}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-[#8b949e]">{entry.name}:</span>
          <span className="text-[#e6edf3] font-medium">{entry.value?.toFixed(2)} €/t</span>
        </div>
      ))}
    </div>
  )
}

export default function PriceChart({ matifData, smsData, period, onPeriodChange }: PriceChartProps) {
  const mergedData = mergeMatifData(matifData)
  const smsByProd = smsByProduct(smsData)

  const allPrices = matifData.flatMap((s) => s.data.map((d) => d.price)).filter(Boolean)
  const yMin = allPrices.length ? Math.floor(Math.min(...allPrices) * 0.95) : 'auto'
  const yMax = allPrices.length ? Math.ceil(Math.max(...allPrices) * 1.05) : 'auto'

  const eurusdSeries = matifData.find((s) => s.ticker === 'EURUSD=X')
  const grainSeries = matifData.filter((s) => s.ticker !== 'EURUSD=X')

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2">
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
          <ComposedChart data={mergedData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
              formatter={(value) => (
                <span style={{ color: '#8b949e', fontSize: 12 }}>{value}</span>
              )}
            />

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

            {/* SMS scatter points */}
            {Object.entries(smsByProd).map(([product, pts]) => (
              <Scatter
                key={`sms-${product}`}
                name={`SMS ${product}`}
                data={pts}
                fill={SMS_COLORS[product] ?? '#58a6ff'}
                r={4}
              />
            ))}
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
                          {(payload[0]?.value as number)?.toFixed(4)}
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
