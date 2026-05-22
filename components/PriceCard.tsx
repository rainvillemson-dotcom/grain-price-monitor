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
  const isZero = latest.change === 0
  const changeColor = isZero ? 'text-[#8b949e]' : isPositive ? 'text-[#3fb950]' : 'text-[#f85149]'
  const arrow = isPositive ? '▲' : '▼'

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-[#484f58] transition-colors cursor-default">
      {/* Label row */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[#8b949e] text-xs font-medium uppercase tracking-wider leading-none">
          {label}
        </span>
        <span className="text-[#484f58] text-[10px] font-mono">{ticker}</span>
      </div>

      {/* Unit */}
      <div className="text-[#484f58] text-[10px] mb-3">{unit}</div>

      {/* Price — main character */}
      {latest.price > 0 ? (
        <>
          <div className="price-value text-[#e6edf3] text-3xl font-bold leading-none mb-2">
            {latest.price.toFixed(2)}
          </div>
          {!isZero && (
            <div className={`text-sm font-medium ${changeColor} leading-none`}>
              {arrow} {Math.abs(latest.change).toFixed(2)}{' '}
              <span className="text-xs opacity-80">
                ({isPositive ? '+' : ''}{latest.changePct.toFixed(2)}%)
              </span>
            </div>
          )}
          {latest.date && (
            <div className="text-[#484f58] text-[10px] mt-3">
              {new Date(latest.date).toLocaleDateString('et-EE', {
                day: '2-digit',
                month: '2-digit',
              })}
            </div>
          )}
        </>
      ) : (
        <div className="text-[#484f58] text-3xl font-bold leading-none">—</div>
      )}
    </div>
  )
}
