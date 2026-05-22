'use client'

import type { MarketLatest } from '@/lib/types'

interface PriceCardProps {
  ticker: string
  label: string
  latest: MarketLatest
  unit?: string
}

export default function PriceCard({ ticker, label, latest, unit = 'EUR/t' }: PriceCardProps) {
  const isPositive = latest.change >= 0
  const changeColor = isPositive ? 'text-[#3fb950]' : 'text-[#f85149]'
  const arrow = isPositive ? '▲' : '▼'

  const formattedDate = latest.date
    ? new Date(latest.date).toLocaleDateString('et-EE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—'

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-[#8b949e] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#8b949e] text-sm font-medium">{label}</span>
        <span className="text-[#8b949e] text-xs font-mono">{ticker}</span>
      </div>

      <div className="space-y-1">
        <div className="text-[#e6edf3] text-2xl font-bold">
          {latest.price > 0 ? (
            <>
              {latest.price.toFixed(2)}{' '}
              <span className="text-sm font-normal text-[#8b949e]">{unit}</span>
            </>
          ) : (
            <span className="text-[#8b949e]">—</span>
          )}
        </div>

        {latest.price > 0 && (
          <div className={`text-sm font-medium ${changeColor}`}>
            {arrow} {Math.abs(latest.change).toFixed(2)} ({isPositive ? '+' : ''}
            {latest.changePct.toFixed(2)}%)
          </div>
        )}

        <div className="text-[#8b949e] text-xs mt-2">{formattedDate}</div>
      </div>
    </div>
  )
}
