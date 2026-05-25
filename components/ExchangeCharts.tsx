'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import type { ExchangeData } from '@/lib/exchange'

interface ExchangeChartsProps {
  instruments: ExchangeData[]
  period: string
  onPeriodChange: (p: string) => void
  selected: Set<string>
}

const PERIODS = [
  { value: '1d',  label: '1P' },
  { value: '5d',  label: '1N' },
  { value: '1mo', label: '1K' },
  { value: '3mo', label: '3K' },
  { value: '6mo', label: '6K' },
  { value: '1y',  label: '1A' },
  { value: '2y',  label: '2A' },
]

function makeXAxisFormatter(period: string) {
  return (date: string): string => {
    if (period === '1d') return String(date).slice(11, 16)
    if (period === '5d') {
      const d = new Date(String(date) + 'Z')
      const day = d.toLocaleDateString('et-EE', { weekday: 'short' })
      return `${day} ${String(date).slice(11, 16)}`
    }
    return new Date(String(date)).toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit' })
  }
}

function makeTooltipDateFormatter(period: string) {
  return (date: string): string => {
    if (period === '1d' || period === '5d') return String(date).replace('T', ' ') + ' UTC'
    return new Date(String(date)).toLocaleDateString('et-EE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  }
}

interface TooltipEntry {
  name: string
  value: number
  color: string
  dataKey: string
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
  formatDate,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
  unit?: string
  formatDate?: (d: string) => string
}) {
  if (!active || !payload?.length) return null
  const displayDate = label
    ? (formatDate ? formatDate(label) : new Date(label).toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' }))
    : ''
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-sm shadow-lg min-w-[160px]">
      <p className="text-[#8b949e] mb-2 text-xs">{displayDate}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-[#8b949e] text-xs truncate max-w-[100px]">{entry.name}:</span>
          <span className="text-[#e6edf3] font-medium ml-auto tabular-nums">
            {Number(entry.value).toFixed(2)}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

interface ChartRowRecord {
  date: string
  [ticker: string]: string | number
}

function buildChartRows(instruments: ExchangeData[]): ChartRowRecord[] {
  const map = new Map<string, ChartRowRecord>()
  for (const inst of instruments) {
    for (const pt of inst.history) {
      const existing = map.get(pt.date) ?? { date: pt.date }
      existing[inst.ticker] = pt.price
      map.set(pt.date, existing)
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  )
}

function yDomain(instruments: ExchangeData[]): [number, number] | ['auto', 'auto'] {
  const prices = instruments.flatMap((i) => i.history.map((p) => p.price)).filter(Boolean)
  if (prices.length === 0) return ['auto', 'auto']
  return [
    Math.floor(Math.min(...prices) * 0.95),
    Math.ceil(Math.max(...prices) * 1.05),
  ]
}

interface GroupChartProps {
  title: string
  unitLabel: string
  instruments: ExchangeData[]
  height?: number
  period: string
}

function GroupChart({ title, unitLabel, instruments, height = 200, period }: GroupChartProps) {
  const hasHistory = instruments.some((i) => i.history.length > 0)
  const xFormatter = makeXAxisFormatter(period)
  const tooltipDateFormatter = makeTooltipDateFormatter(period)

  return (
    <div>
      <p className="text-[#8b949e] text-xs mb-2 font-medium">
        {title}{' '}
        <span className="text-[#484f58] font-normal">· {unitLabel}</span>
      </p>
      {!hasHistory ? (
        <div
          style={{ height }}
          className="flex items-center justify-center text-[#484f58] text-sm border border-dashed border-[#30363d] rounded-lg"
        >
          {period === '1d' || period === '5d'
            ? 'Intraday andmed saadaval ainult avatud börsi ajal'
            : 'Ajaloolised andmed kogunevad iga päevaga'}
        </div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={buildChartRows(instruments)}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis
                dataKey="date"
                tickFormatter={xFormatter}
                tick={{ fill: '#8b949e', fontSize: 10 }}
                axisLine={{ stroke: '#30363d' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={yDomain(instruments)}
                tick={{ fill: '#8b949e', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v: number) => String(v)}
              />
              <Tooltip
                content={({ active, payload, label }) => (
                  <ChartTooltip
                    active={active}
                    payload={payload as TooltipEntry[]}
                    label={String(label ?? '')}
                    unit={unitLabel}
                    formatDate={tooltipDateFormatter}
                  />
                )}
              />
              {instruments.length > 1 && (
                <Legend
                  formatter={(value: string) => (
                    <span style={{ fontSize: 11, color: '#8b949e' }}>{value}</span>
                  )}
                />
              )}
              {instruments.map((inst) => (
                <Line
                  key={inst.ticker}
                  type="monotone"
                  dataKey={inst.ticker}
                  name={inst.label}
                  stroke={inst.color}
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default function ExchangeCharts({
  instruments,
  period,
  onPeriodChange,
  selected,
}: ExchangeChartsProps) {
  const visible = instruments.filter((i) => selected.has(i.ticker))

  const matifInst = visible.filter((i) => i.group === 'matif')
  const cbotInst  = visible.filter((i) => i.group === 'cbot')
  const oilInst   = visible.filter((i) => i.group === 'oil')
  const fxInst    = visible.filter((i) => i.group === 'fx')

  const hasAnyChart =
    matifInst.length > 0 || cbotInst.length > 0 || oilInst.length > 0 || fxInst.length > 0

  if (!hasAnyChart) return null

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-5">
      {/* Shared period buttons */}
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

      {/* MATIF */}
      {matifInst.length > 0 && (
        <GroupChart
          title="MATIF"
          unitLabel="EUR/t"
          instruments={matifInst}
          height={200}
          period={period}
        />
      )}

      {/* CBOT */}
      {cbotInst.length > 0 && (
        <GroupChart
          title="CBOT"
          unitLabel="USDc/bu"
          instruments={cbotInst}
          height={200}
          period={period}
        />
      )}

      {/* WTI Oil */}
      {oilInst.length > 0 && (
        <GroupChart
          title="WTI Toorõli"
          unitLabel="USD/bbl"
          instruments={oilInst}
          height={160}
          period={period}
        />
      )}

      {/* EUR/USD */}
      {fxInst.length > 0 && (
        <GroupChart
          title="EUR/USD"
          unitLabel="EUR"
          instruments={fxInst}
          height={140}
          period={period}
        />
      )}
    </div>
  )
}
