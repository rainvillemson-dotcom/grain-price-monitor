'use client'

import type { ExchangeData } from '@/lib/exchange'

interface ExchangeCardProps {
  instrument: ExchangeData
}

const EXCHANGE_BADGE: Record<string, string> = {
  MATIF: 'text-[#3fb950] bg-[#3fb950]/10',
  CBOT:  'text-[#58a6ff] bg-[#58a6ff]/10',
  WTI:   'text-[#e85151] bg-[#e85151]/10',
  FX:    'text-[#39d353] bg-[#39d353]/10',
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
  const changeColor = isZero ? 'text-[#8b949e]' : isPositive ? 'text-[#3fb950]' : 'text-[#f85149]'
  const arrow = isPositive ? '▲' : '▼'

  // Decimal precision by unit
  const decimals = unit === 'EUR' ? 4 : unit.includes('bbl') ? 2 : 2

  const badgeClass = EXCHANGE_BADGE[exchange] ?? 'text-[#8b949e] bg-[#8b949e]/10'

  return (
    <div
      className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-[#484f58] transition-colors cursor-default"
      style={{ borderLeftColor: color, borderLeftWidth: 2 }}
    >
      {/* Top row: label + exchange badge */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[#e6edf3] text-xs font-medium leading-tight">{label}</span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${badgeClass}`}>
          {exchange}
        </span>
      </div>

      {/* Ticker + unit */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#484f58] text-[10px] font-mono">{ticker}</span>
        <span className="text-[#484f58] text-[10px]">· {unit}</span>
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
          <div className="price-value text-[#e6edf3] text-3xl font-bold leading-none mb-2">
            {price.toFixed(decimals)}
          </div>

          {/* Change */}
          {!isZero && (
            <div className={`text-sm font-medium ${changeColor} leading-none`}>
              {arrow} {Math.abs(change).toFixed(decimals)}{' '}
              <span className="text-xs opacity-80">
                ({isPositive ? '+' : ''}{changePct.toFixed(2)}%)
              </span>
            </div>
          )}

          {/* H/L — supporting cast */}
          {(high !== null || low !== null) && (
            <div className="flex gap-3 mt-3">
              {high !== null && (
                <span className="text-[#484f58] text-[10px]">
                  H <span className="text-[#8b949e]">{high.toFixed(2)}</span>
                </span>
              )}
              {low !== null && (
                <span className="text-[#484f58] text-[10px]">
                  L <span className="text-[#8b949e]">{low.toFixed(2)}</span>
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
