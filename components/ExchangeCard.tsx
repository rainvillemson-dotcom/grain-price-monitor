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

export default function ExchangeCard({ instrument }: ExchangeCardProps) {
  const { ticker, label, exchange, unit, color, latest } = instrument
  const { price, change, changePct, high, low } = latest

  const hasPrice = Number.isFinite(price) && price > 0
  const isPositive = change >= 0
  const isZero = change === 0
  const changeColor = isZero ? '#8b949e' : isPositive ? '#3fb950' : '#f85149'
  const arrow = isPositive ? '▲' : '▼'

  const decimals = unit === 'USD/EUR' ? 4 : 2
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
        <span className="text-sm font-medium leading-snug" style={{ color: '#e6edf3' }}>
          {label}
        </span>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
          style={{ color: badge.color, backgroundColor: badge.bg }}
        >
          {exchange}
        </span>
      </div>

      {/* Unit */}
      <div className="text-xs mb-3" style={{ color: '#6e7681' }}>
        {unit}
      </div>

      {!hasPrice ? (
        <div className="space-y-2">
          <div className="text-4xl font-bold leading-none" style={{ color: '#8b949e' }}>
            -
          </div>
          <div className="text-xs" style={{ color: '#8b949e' }}>
            Andmed puuduvad
          </div>
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

          {/* Päeva kõrgeim / madalaim */}
          {(high !== null || low !== null) && (
            <div className="flex gap-3 mt-3">
              {high !== null && (
                <span className="text-xs" style={{ color: '#6e7681' }}>
                  Kõrg <span style={{ color: '#8b949e' }}>{high.toFixed(decimals)}</span>
                </span>
              )}
              {low !== null && (
                <span className="text-xs" style={{ color: '#6e7681' }}>
                  Madal <span style={{ color: '#8b949e' }}>{low.toFixed(decimals)}</span>
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
