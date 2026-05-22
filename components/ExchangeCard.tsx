'use client'

import type { ExchangeData } from '@/lib/exchange'

interface ExchangeCardProps {
  instrument: ExchangeData
}

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#21262d] rounded ${className ?? ''}`} />
}

export default function ExchangeCard({ instrument }: ExchangeCardProps) {
  const { ticker, label, unit, latest } = instrument
  const { price, change, changePct, high, low } = latest

  const isSkeleton = price === 0
  const isPositive = change >= 0
  const changeColor = isPositive ? 'text-[#3fb950]' : 'text-[#f85149]'
  const arrow = isPositive ? '▲' : '▼'

  const decimals = unit === 'EUR' ? 4 : 2

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-[#8b949e] transition-colors">
      <div className="flex items-start justify-between mb-3 gap-1">
        <span className="text-[#e6edf3] text-sm font-medium leading-tight">{label}</span>
        <span className="text-[#8b949e] text-xs font-mono shrink-0">{ticker}</span>
      </div>

      <div className="text-[#8b949e] text-xs mb-3">{unit}</div>

      {isSkeleton ? (
        <div className="space-y-2">
          <Pulse className="h-7 w-28" />
          <Pulse className="h-4 w-24" />
          <Pulse className="h-3 w-20" />
        </div>
      ) : (
        <div className="space-y-1">
          <div className="text-[#e6edf3] text-2xl font-bold tabular-nums">
            {price.toFixed(decimals)}
          </div>

          <div className={`text-sm font-medium ${changeColor}`}>
            {arrow} {Math.abs(change).toFixed(decimals)} ({isPositive ? '+' : ''}
            {changePct.toFixed(2)}%)
          </div>

          {(high !== null || low !== null) && (
            <div className="text-[#8b949e] text-xs flex gap-2 mt-1">
              {high !== null && <span>H:{high.toFixed(2)}</span>}
              {low !== null && <span>L:{low.toFixed(2)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
