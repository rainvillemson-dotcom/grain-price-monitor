'use client'

import type { ExchangeData } from '@/lib/exchange'

interface ExchangeCardProps {
  instrument: ExchangeData
}

const EXCHANGE_BADGE: Record<string, { color: string; bg: string }> = {
  MATIF: { color: '#3fb950', bg: 'rgba(63,185,80,0.12)' },
  CBOT:  { color: '#58a6ff', bg: 'rgba(88,166,255,0.12)' },
  WTI:   { color: '#f85149', bg: 'rgba(248,81,73,0.12)' },
  FX:    { color: '#3fb950', bg: 'rgba(63,185,80,0.12)' },
}

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#21262d] rounded ${className ?? ''}`} />
}

export default function ExchangeCard({ instrument }: ExchangeCardProps) {
  const { ticker, label, exchange, unit, color, latest } = instrument
  const { price, change, changePct, high, low } = latest

  const isSkeleton = price === 0
  const isPositive = change >= 0
  const isZero = change === 0
  const changeColor = isZero ? '#8b949e' : isPositive ? '#3fb950' : '#f85149'
  const arrow = isPositive ? '▲' : '▼'

  const decimals = unit === 'EUR' ? 4 : 2
  const badge = EXCHANGE_BADGE[exchange] ?? { color: '#8b949e', bg: 'rgba(139,148,158,0.12)' }

  return (
    <div
      className="rounded-xl p-4 cursor-default transition-colors shrink-0"
      style={{
        backgroundColor: '#161b22',
        borderLeft: `2px solid ${color}`,
      }}
    >
      {/* Top row: label + exchange badge */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs font-medium leading-tight" style={{ color: '#e6edf3' }}>
          {label}
        </span>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
          style={{ color: badge.color, backgroundColor: badge.bg }}
        >
          {exchange}
        </span>
      </div>

      {/* Ticker below badge */}
      <div className="text-[10px] font-mono mb-3" style={{ color: '#484f58' }}>
        {ticker} · {unit}
      </div>

      {isSkeleton ? (
        <div className="space-y-2">
          <Pulse className="h-8 w-28" />
          <Pulse className="h-4 w-24" />
          <Pulse className="h-3 w-16" />
        </div>
      ) : (
        <>
          {/* Price — main character */}
          <div className="num text-4xl font-bold leading-none mb-2" style={{ color: '#e6edf3' }}>
            {price.toFixed(decimals)}
          </div>

          {/* Change */}
          {!isZero && (
            <div className="text-sm font-medium leading-none" style={{ color: changeColor }}>
              {arrow} {Math.abs(change).toFixed(decimals)}{' '}
              <span className="text-xs" style={{ opacity: 0.8 }}>
                ({isPositive ? '+' : ''}{changePct.toFixed(2)}%)
              </span>
            </div>
          )}

          {/* H/L */}
          {(high !== null || low !== null) && (
            <div className="flex gap-3 mt-3">
              {high !== null && (
                <span className="text-[10px]" style={{ color: '#484f58' }}>
                  H <span style={{ color: '#8b949e' }}>{high.toFixed(2)}</span>
                </span>
              )}
              {low !== null && (
                <span className="text-[10px]" style={{ color: '#484f58' }}>
                  L <span style={{ color: '#8b949e' }}>{low.toFixed(2)}</span>
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
