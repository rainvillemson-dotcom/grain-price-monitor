'use client'

import type { MarketLatest } from '@/lib/types'

interface PriceCardProps {
  ticker: string
  label: string
  latest: MarketLatest
  unit?: string
}

export default function PriceCard({ label, latest, unit = 'EUR/t' }: PriceCardProps) {
  const isPositive = latest.change >= 0
  const isZero = latest.change === 0
  const changeColor = isZero ? '#8b949e' : isPositive ? '#3fb950' : '#f85149'
  const arrow = isPositive ? '▲' : '▼'

  return (
    <div
      className="rounded-xl p-4 cursor-default transition-colors"
      style={{ backgroundColor: '#161b22' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1c2128')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#161b22')}
    >
      {/* Label */}
      <div
        className="text-[10px] uppercase tracking-widest mb-3 leading-none"
        style={{ color: '#484f58' }}
      >
        {label}
      </div>

      {latest.price > 0 ? (
        <>
          {/* Price — main character */}
          <div className="flex items-baseline gap-1.5 mb-2">
            <span
              className="num text-4xl font-bold leading-none"
              style={{ color: '#e6edf3' }}
            >
              {latest.price.toFixed(2)}
            </span>
            {unit && (
              <span className="text-[10px] leading-none" style={{ color: '#484f58' }}>
                {unit}
              </span>
            )}
          </div>

          {/* Change */}
          {!isZero && (
            <div className="text-sm font-medium leading-none" style={{ color: changeColor }}>
              {arrow} {Math.abs(latest.change).toFixed(2)}{' '}
              <span className="text-xs" style={{ opacity: 0.8 }}>
                ({isPositive ? '+' : ''}{latest.changePct.toFixed(2)}%)
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="text-4xl font-bold leading-none" style={{ color: '#484f58' }}>
          —
        </div>
      )}
    </div>
  )
}
